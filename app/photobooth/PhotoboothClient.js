'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FILTERS, PROPS, drawProp, mapKeypointsToSquare } from '../lib/photoboothProps';
import { pickPoses } from '../lib/photoboothPoses';
import { useFaceTracker } from './useFaceTracker';
import { useWebRTCRoom } from './useWebRTCRoom';
import { savePhotoboothStrip } from './actions';

const CANVAS_SIZE = 480;
const SHOT_W = 700;
const SHOT_H = 350;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Cameras aren't natively square, so center-crop each frame to a square
// ourselves rather than relying on getUserMedia's aspectRatio constraint
// (which some webcam drivers negotiate badly, returning degenerate frames).
function drawVideoCoverSquare(ctx, video, destSize) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  let sx = 0;
  let sy = 0;
  let size = vw;
  if (vw > vh) {
    size = vh;
    sx = (vw - vh) / 2;
  } else if (vh > vw) {
    size = vw;
    sy = (vh - vw) / 2;
  }
  ctx.drawImage(video, sx, sy, size, size, 0, 0, destSize, destSize);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function PhotoboothClient({ role, initialStrips }) {
  const partnerName = role === 'admin' ? 'Grishma' : 'Saket';

  const [permissionState, setPermissionState] = useState('idle'); // idle | requesting | granted | denied
  const [errorMsg, setErrorMsg] = useState('');
  const [filterId, setFilterId] = useState('none');
  const [propId, setPropId] = useState('none');
  const [shotCount, setShotCount] = useState(4);
  const [sessionPhase, setSessionPhase] = useState('idle'); // idle | countdown | review
  const [currentPose, setCurrentPose] = useState('');
  const [currentCount, setCurrentCount] = useState(null);
  const [resultDataUrl, setResultDataUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [strips, setStrips] = useState(initialStrips || []);
  const [localStream, setLocalStream] = useState(null);
  const [outgoingStream, setOutgoingStream] = useState(null);

  const router = useRouter();

  // The <video> is rendered unconditionally from the very first paint (never
  // remounted based on permission state) — this mirrors the proven-working
  // /camtest pattern exactly, removing any mount-timing race between
  // getUserMedia resolving and the element existing in the DOM.
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  // overlayCanvas: transparent, draws only props on top of the live <video>.
  // compositeCanvas: hidden, bakes video+filter+props together for the
  // outgoing WebRTC stream and for photo capture.
  const overlayCanvasRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const shotsRef = useRef([]);
  const runningRef = useRef(false);
  const cancelledRef = useRef(false);
  const filterIdRef = useRef(filterId);
  const propIdRef = useRef(propId);

  useEffect(() => { filterIdRef.current = filterId; }, [filterId]);
  useEffect(() => { propIdRef.current = propId; }, [propId]);

  const activeFilterCss = (FILTERS.find((f) => f.id === filterId) || FILTERS[0]).css;

  const keypoints = useFaceTracker(videoRef, propId !== 'none' && permissionState === 'granted');
  const keypointsRef = useRef(keypoints);
  useEffect(() => { keypointsRef.current = keypoints; }, [keypoints]);

  const { peerOnline, connectionState, remoteStream, sendEvent, onSessionEvent } =
    useWebRTCRoom(role, outgoingStream);

  // Single render loop: (1) draw props onto the transparent overlay canvas
  // for the local preview (the camera itself is a real <video> underneath),
  // and (2) bake video+filter+props into the hidden composite canvas that
  // feeds WebRTC + capture. The camera is shown by the <video> element, so
  // the preview never goes black even if this loop misses frames.
  useEffect(() => {
    if (!localStream) return undefined;
    let raf;
    const render = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 1) {
        const hasProp = propIdRef.current !== 'none';
        const mapped = hasProp
          ? mapKeypointsToSquare(keypointsRef.current, video.videoWidth, video.videoHeight, CANVAS_SIZE)
          : null;

        const overlay = overlayCanvasRef.current;
        if (overlay) {
          const octx = overlay.getContext('2d');
          octx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          if (mapped) drawProp(octx, propIdRef.current, mapped);
        }

        const comp = compositeCanvasRef.current;
        if (comp) {
          const cctx = comp.getContext('2d');
          cctx.save();
          cctx.translate(CANVAS_SIZE, 0);
          cctx.scale(-1, 1);
          const filter = FILTERS.find((f) => f.id === filterIdRef.current);
          cctx.filter = filter ? filter.css : 'none';
          drawVideoCoverSquare(cctx, video, CANVAS_SIZE);
          cctx.filter = 'none';
          if (mapped) drawProp(cctx, propIdRef.current, mapped);
          cctx.restore();
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
      if (remoteStream) remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Backstop: if for any reason the callback ref didn't attach (e.g. a fast
  // remount), reattach here. The callback ref is the primary path.
  useEffect(() => {
    const video = videoRef.current;
    if (video && localStream && video.srcObject !== localStream) {
      video.srcObject = localStream;
      video.play().catch(() => {});
    }
  }, [localStream, permissionState]);

  // Once the composite canvas is mounted and drawing, capture it as the
  // outgoing WebRTC video track (silent booth — video only, no mic).
  useEffect(() => {
    if (permissionState === 'granted' && compositeCanvasRef.current && localStream && !outgoingStream) {
      const canvasStream = compositeCanvasRef.current.captureStream(24);
      setOutgoingStream(canvasStream);
    }
  }, [permissionState, localStream, outgoingStream]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      localStream?.getTracks().forEach((t) => t.stop());
      outgoingStream?.getTracks().forEach((t) => t.stop());
    };
  }, [localStream, outgoingStream]);

  const enableCamera = async () => {
    setPermissionState('requesting');
    setErrorMsg('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('denied');
      setErrorMsg('This browser blocks camera access unless the page is served over HTTPS or localhost.');
      return;
    }
    try {
      // Video only, no mic at all — this is the exact call proven to work on
      // /camtest. This is a silent photo booth by design, not a video call.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localStreamRef.current = stream;
      // videoRef.current is guaranteed to exist — the <video> is always
      // mounted, never gated behind permissionState.
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      setLocalStream(stream);
      setPermissionState('granted');
    } catch (err) {
      setPermissionState('denied');
      const name = err?.name || 'Error';
      const hint =
        name === 'NotAllowedError'
          ? 'Camera permission is blocked. Click the camera icon in the address bar → Allow, then retry.'
          : name === 'NotReadableError'
            ? 'Your camera is busy in another app (Zoom, Teams, Windows Camera). Close it and retry.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device.'
              : 'Could not access your camera. Please check permissions and try again.';
      setErrorMsg(`${hint} (${name})`);
    }
  };

  const captureShot = useCallback(() => {
    const shotCanvas = document.createElement('canvas');
    shotCanvas.width = SHOT_W;
    shotCanvas.height = SHOT_H;
    const ctx = shotCanvas.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, SHOT_W, SHOT_H);

    const half = SHOT_W / 2;
    const ownEl = compositeCanvasRef.current;
    const remoteEl = remoteVideoRef.current;
    const leftEl = role === 'admin' ? ownEl : remoteEl;
    const rightEl = role === 'admin' ? remoteEl : ownEl;

    if (leftEl) ctx.drawImage(leftEl, 0, 0, half, SHOT_H);
    if (rightEl && remoteStream) ctx.drawImage(rightEl, half, 0, half, SHOT_H);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(half - 4, 0, 8, SHOT_H);
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🤍', half, SHOT_H / 2);

    shotsRef.current.push(shotCanvas.toDataURL('image/jpeg', 0.92));
  }, [role, remoteStream]);

  const buildStrip = async (shots, poses) => {
    const MARGIN = 26;
    const CARD_W = 760;
    const HEADER_H = 90;
    const CAPTION_H = 34;
    const FOOTER_H = 60;
    const cardH = HEADER_H + shots.length * (SHOT_H + CAPTION_H + MARGIN) + FOOTER_H;

    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = cardH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, CARD_W, cardH);

    ctx.fillStyle = '#880E4F';
    ctx.textAlign = 'center';
    ctx.font = "italic 700 32px 'Playfair Display', Georgia, serif";
    ctx.fillText('Saket ♥ Grishma', CARD_W / 2, 55);

    let y = HEADER_H;
    const x = (CARD_W - SHOT_W) / 2;
    for (let i = 0; i < shots.length; i++) {
      const img = await loadImage(shots[i]);
      ctx.save();
      roundRectPath(ctx, x, y, SHOT_W, SHOT_H, 14);
      ctx.clip();
      ctx.filter = 'contrast(1.05) saturate(1.1)';
      ctx.drawImage(img, x, y, SHOT_W, SHOT_H);
      ctx.filter = 'none';
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, SHOT_W - 1, SHOT_H - 1);

      ctx.fillStyle = '#5D4037';
      ctx.font = "24px 'Segoe Print', 'Comic Sans MS', cursive";
      ctx.fillText(poses[i] || '', CARD_W / 2, y + SHOT_H + 24);

      y += SHOT_H + CAPTION_H + MARGIN;
    }

    ctx.fillStyle = '#a1887f';
    ctx.font = "600 16px 'Quicksand', sans-serif";
    ctx.fillText(
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      CARD_W / 2,
      cardH - 26
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const uploadStrip = async (dataUrl, poses) => {
    setSaving(true);
    setStatusMsg('Saving your strip... 💌');
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `photobooth_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shot_count', String(poses.length));
      formData.append('poses', JSON.stringify(poses));
      const result = await savePhotoboothStrip(formData);
      setResultUrl(result.url);
      setStrips((prev) => [{ id: `temp-${Date.now()}`, image_url: result.url, created_at: new Date().toISOString() }, ...prev]);
      sendEvent('session', { type: 'saved', url: result.url });
      setStatusMsg('Saved to your Photo Booth gallery! 💖');
      router.refresh();
    } catch (err) {
      setStatusMsg(`Couldn't save (${err.message}) — you can still download it below.`);
    } finally {
      setSaving(false);
    }
  };

  const runLocalSequence = useCallback(async (payload) => {
    if (runningRef.current) return;
    runningRef.current = true;
    shotsRef.current = [];
    setResultDataUrl(null);
    setResultUrl(null);
    setSessionPhase('countdown');

    const { poses, initiator } = payload;
    for (let i = 0; i < poses.length; i++) {
      if (cancelledRef.current) return;
      setCurrentPose(poses[i]);
      setCurrentCount(null);
      await sleep(1800);
      for (const c of [3, 2, 1]) {
        if (cancelledRef.current) return;
        setCurrentCount(c);
        await sleep(700);
      }
      setCurrentCount('📸');
      captureShot();
      await sleep(350);
      setCurrentCount(null);
      await sleep(300);
    }

    if (cancelledRef.current) return;
    setSessionPhase('review');
    const stripDataUrl = await buildStrip(shotsRef.current, poses);
    setResultDataUrl(stripDataUrl);
    runningRef.current = false;

    if (initiator === role) {
      uploadStrip(stripDataUrl, poses);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureShot, role]);

  useEffect(() => {
    onSessionEvent((payload) => {
      if (payload.type === 'start') {
        runLocalSequence(payload);
      } else if (payload.type === 'saved') {
        setResultUrl(payload.url);
        setStatusMsg('Saved to your Photo Booth gallery! 💖');
      }
    });
  }, [onSessionEvent, runLocalSequence]);

  const startSession = () => {
    if (runningRef.current || connectionState !== 'connected') return;
    const poses = pickPoses(shotCount);
    sendEvent('session', { type: 'start', shotCount, poses, initiator: role });
  };

  const resetForAnother = () => {
    setSessionPhase('idle');
    setResultDataUrl(null);
    setResultUrl(null);
    setStatusMsg('');
  };

  const downloadResult = () => {
    const src = resultUrl || resultDataUrl;
    if (!src) return;
    const link = document.createElement('a');
    link.download = `PhotoBooth_${Date.now()}.jpg`;
    link.href = src;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="photobooth-page">
      <div className="photobooth-header">
        <h1 className="photobooth-title">Photo Booth 📹</h1>
        <p className="photobooth-sub">Come online together and snap a strip of cute memories.</p>
      </div>

      {permissionState === 'granted' && (
        <div className="booth-picker-row">
          <div className="booth-picker-group">
            <span className="booth-picker-label">Filter</span>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`booth-chip ${filterId === f.id ? 'active' : ''}`}
                onClick={() => setFilterId(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="booth-picker-group">
            <span className="booth-picker-label">Prop</span>
            {PROPS.map((p) => (
              <button
                key={p.id}
                className={`booth-chip ${propId === p.id ? 'active' : ''}`}
                onClick={() => setPropId(p.id)}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="booth-stage">
        <div className="booth-video-frame">
          {/* Always mounted from first paint — never gated behind
              permissionState — so getUserMedia can attach to a guaranteed,
              already-existing element instead of racing a conditional mount. */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="booth-media booth-mirror"
            style={{ filter: activeFilterCss }}
          />
          <canvas
            ref={overlayCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="booth-media booth-overlay booth-mirror"
          />
          <span className="booth-video-tag">You</span>

          {permissionState !== 'granted' && (
            <div className="booth-permission-overlay">
              {errorMsg && <p className="login-error-msg">{errorMsg}</p>}
              <p>Enable your camera to start the booth with {partnerName}.</p>
              <button className="btn-save" onClick={enableCamera} disabled={permissionState === 'requesting'}>
                {permissionState === 'requesting' ? 'Requesting access...' : '📸 Enable Camera'}
              </button>
            </div>
          )}
        </div>
        <div className="booth-video-frame">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="booth-media" />
          ) : (
            <div className="booth-waiting-panel">
              {peerOnline ? 'Connecting to ' + partnerName + '...' : 'Waiting for ' + partnerName + ' to join...'}
            </div>
          )}
          <span className="booth-video-tag">{partnerName}</span>
        </div>
        {/* Hidden canvas that bakes video+filter+props for WebRTC + capture */}
        <canvas
          ref={compositeCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ display: 'none' }}
        />

        {sessionPhase === 'countdown' && (
          <div className="booth-countdown-overlay">
            <p className="booth-pose-text">{currentPose}</p>
            {currentCount && <p className="booth-count-number">{currentCount}</p>}
          </div>
        )}
      </div>

      {permissionState === 'granted' && (
        <>

          <div className="booth-connection-status">
            {connectionState === 'connected'
              ? `Connected with ${partnerName} 💕`
              : connectionState === 'connecting'
                ? 'Connecting...'
                : peerOnline
                  ? `${partnerName} is online, connecting...`
                  : `Waiting for ${partnerName}...`}
          </div>

          {sessionPhase === 'idle' && (
            <div className="booth-start-row">
              <label htmlFor="shotCount">Shots:</label>
              <select id="shotCount" value={shotCount} onChange={(e) => setShotCount(Number(e.target.value))}>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
              </select>
              <button className="btn-save" onClick={startSession} disabled={connectionState !== 'connected'}>
                ✨ Start Photo Booth
              </button>
            </div>
          )}

          {sessionPhase === 'review' && resultDataUrl && (
            <div className="booth-result-panel">
              <img src={resultUrl || resultDataUrl} alt="Your photo booth strip" className="booth-result-img" />
              {statusMsg && <p className="booth-status-msg">{statusMsg}</p>}
              <div className="booth-result-actions">
                <button className="btn-save" onClick={downloadResult}>💾 Download</button>
                <button className="btn-reset" onClick={resetForAnother}>🔄 Take Another</button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="booth-gallery-section">
        <h2>Past Strips</h2>
        {strips.length === 0 ? (
          <p className="booth-gallery-empty">No strips yet — take your first one above!</p>
        ) : (
          <div className="booth-gallery-grid">
            {strips.map((s) => (
              <img key={s.id} src={s.image_url} alt="Photo booth strip" className="booth-gallery-item" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
