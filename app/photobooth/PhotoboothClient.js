'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FILTERS, PROPS_LIST } from '../lib/photoboothProps';
import { pickPoses } from '../lib/photoboothPoses';
import { useWebRTCRoom } from './useWebRTCRoom';
import { savePhotoboothStrip } from './actions';
import { createEnhancer } from '../lib/photoboothEnhance';
import { useFaceTracker } from './useFaceTracker';

const CANVAS_SIZE = 480;
const MIN_CANVAS_SIZE = 320;
const MAX_CANVAS_SIZE = 480;
const SHOT_W = 700;
const SHOT_H = 350;

const MIN_FPS = 25;
const TARGET_FPS = 40;
const PERF_WINDOW_MS = 1000;
const ENHANCE_INTERVAL = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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

function computeFaceAnchors(keypoints, vw, vh, canvasSize) {
  if (!keypoints || keypoints.length < 6 || !vw || !vh) return null;

  let sx = 0;
  let sy = 0;
  let cropSize = vw;
  if (vw > vh) {
    cropSize = vh;
    sx = (vw - vh) / 2;
  } else if (vh > vw) {
    cropSize = vw;
    sy = (vh - vw) / 2;
  }

  const mapPt = (kp) => {
    const rawX = kp.x * vw;
    const rawY = kp.y * vh;
    const cx = ((rawX - sx) / cropSize) * canvasSize;
    const cy = ((rawY - sy) / cropSize) * canvasSize;
    return { x: cx, y: cy };
  };

  const rightEye = mapPt(keypoints[0]);
  const leftEye = mapPt(keypoints[1]);
  const nose = mapPt(keypoints[2]);
  const mouth = mapPt(keypoints[3]);

  const eyeMidX = (rightEye.x + leftEye.x) / 2;
  const eyeMidY = (rightEye.y + leftEye.y) / 2;

  const dx = leftEye.x - rightEye.x;
  const dy = leftEye.y - rightEye.y;
  const eyeDist = Math.hypot(dx, dy);

  const angle = Math.atan2(dy, dx);

  const len = eyeDist || 1;
  const upX = -dy / len;
  const upY = dx / len;

  return {
    rightEye,
    leftEye,
    nose,
    mouth,
    eyeMidX,
    eyeMidY,
    eyeDist,
    angle,
    upX,
    upY,
  };
}

function getPropTransform(propId, propDef, anchors, canvasSize) {
  if (!anchors) {
    let defY = canvasSize / 2;
    if (['bunny', 'crown', 'flower', 'angel'].includes(propId)) {
      defY = canvasSize * 0.32;
    }
    return {
      x: canvasSize / 2,
      y: defY,
      width: propDef.defaultWidth || 160,
      height: propDef.defaultHeight || 160,
      rotation: 0,
    };
  }

  const { eyeMidX, eyeMidY, eyeDist, angle, upX, upY } = anchors;
  const baseScale = (propDef.defaultWidth || 160) / 160;

  if (propId === 'heart-glasses' || propId === 'retro-glasses') {
    const w = eyeDist * 2.25 * baseScale;
    const h = (propDef.defaultHeight / propDef.defaultWidth) * w;
    return {
      x: eyeMidX,
      y: eyeMidY,
      width: w,
      height: h,
      rotation: angle,
    };
  }

  let offsetMult = 1.25;
  let scaleMult = 2.4;

  if (propId === 'bunny') {
    offsetMult = 1.35;
    scaleMult = 2.6;
  } else if (propId === 'crown') {
    offsetMult = 1.05;
    scaleMult = 2.2;
  } else if (propId === 'flower') {
    offsetMult = 0.95;
    scaleMult = 2.4;
  } else if (propId === 'angel') {
    offsetMult = 1.5;
    scaleMult = 2.3;
  }

  const offsetDist = eyeDist * offsetMult;
  const w = eyeDist * scaleMult * baseScale;
  const h = (propDef.defaultHeight / propDef.defaultWidth) * w;

  return {
    x: eyeMidX + upX * offsetDist,
    y: eyeMidY + upY * offsetDist,
    width: w,
    height: h,
    rotation: angle,
  };
}

export default function PhotoboothClient({ role, initialStrips }) {
  const partnerName = role === 'admin' ? 'Grishma' : 'Saket';

  const [permissionState, setPermissionState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [filterId, setFilterId] = useState('none');
  const [activeProps, setActiveProps] = useState([]);
  const [shotCount, setShotCount] = useState(4);
  const [sessionPhase, setSessionPhase] = useState('idle');
  const [currentPose, setCurrentPose] = useState('');
  const [currentCount, setCurrentCount] = useState(null);
  const [resultDataUrl, setResultDataUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [strips, setStrips] = useState(initialStrips || []);
  const [localStream, setLocalStream] = useState(null);
  const [outgoingStream, setOutgoingStream] = useState(null);
  const [currentCanvasSize, setCurrentCanvasSize] = useState(CANVAS_SIZE);
  const [captureFps, setCaptureFps] = useState(24);
  const [perfMode, setPerfMode] = useState('normal');

  const router = useRouter();

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const shotsRef = useRef([]);
  const runningRef = useRef(false);
  const cancelledRef = useRef(false);
  const filterIdRef = useRef(filterId);
  const canvasSizeRef = useRef(currentCanvasSize);
  const captureFpsRef = useRef(captureFps);
  const perfModeRef = useRef(perfMode);
  const frameTimesRef = useRef([]);
  const lastPerfCheckRef = useRef(0);
  const enhancerRef = useRef(null);
  const enhanceFrameRef = useRef(0);
  const overlayCtxRef = useRef(null);
  const compCtxRef = useRef(null);

  const activePropsRef = useRef([]);
  const propImagesRef = useRef({});

  // Real-time MediaPipe face tracking keypoints
  const faceKeypoints = useFaceTracker(videoRef, permissionState === 'granted');
  const keypointsRef = useRef(null);

  useEffect(() => { keypointsRef.current = faceKeypoints; }, [faceKeypoints]);
  useEffect(() => { filterIdRef.current = filterId; }, [filterId]);
  useEffect(() => { canvasSizeRef.current = currentCanvasSize; }, [currentCanvasSize]);
  useEffect(() => { captureFpsRef.current = captureFps; }, [captureFps]);
  useEffect(() => { perfModeRef.current = perfMode; }, [perfMode]);
  useEffect(() => { activePropsRef.current = activeProps; }, [activeProps]);

  const activeFilterCss = (FILTERS.find((f) => f.id === filterId) || FILTERS[0]).css;

  const { peerOnline, connectionState, remoteStream, sendEvent, onSessionEvent } =
    useWebRTCRoom(role, outgoingStream);

  useEffect(() => {
    PROPS_LIST.forEach((prop) => {
      const img = new Image();
      img.onload = () => {
        propImagesRef.current[prop.id] = img;
      };
      img.src = prop.src;
    });
  }, []);

  useEffect(() => {
    if (!enhancerRef.current) {
      enhancerRef.current = createEnhancer({
        canvasSize: CANVAS_SIZE,
        scanSize: 160,
        historySize: 3,
        softSkinAlpha: 0.35,
        softSkinBlur: 2,
        lumaLowThreshold: 80,
        lumaHighThreshold: 140,
        enableTemporal: true,
        enableAutoContrast: true,
        enableSoftSkin: false,
      });
    }
    const overlay = overlayCanvasRef.current;
    const comp = compositeCanvasRef.current;
    if (overlay) overlayCtxRef.current = overlay.getContext('2d');
    if (comp) compCtxRef.current = comp.getContext('2d');
  }, []);

  useEffect(() => {
    if (!localStream) return undefined;
    let raf;
    let lastFrameTime = performance.now();

    const render = (now) => {
      if (cancelledRef.current) return;
      const video = videoRef.current;

      if (!overlayCtxRef.current && overlayCanvasRef.current) {
        overlayCtxRef.current = overlayCanvasRef.current.getContext('2d');
      }
      if (!compCtxRef.current && compositeCanvasRef.current) {
        compCtxRef.current = compositeCanvasRef.current.getContext('2d');
      }

      if (video && video.readyState >= 2 && video.videoWidth > 1) {
        const size = canvasSizeRef.current;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const nowTs = performance.now();
        frameTimesRef.current.push(nowTs);
        while (frameTimesRef.current.length > 0 && frameTimesRef.current[0] < nowTs - PERF_WINDOW_MS) {
          frameTimesRef.current.shift();
        }

        if (nowTs - lastPerfCheckRef.current > PERF_WINDOW_MS) {
          lastPerfCheckRef.current = nowTs;
          const fps = frameTimesRef.current.length;
          if (fps < MIN_FPS && perfModeRef.current !== 'low') {
            const newSize = Math.max(MIN_CANVAS_SIZE, size - 80);
            setCurrentCanvasSize(newSize);
            setCaptureFps(Math.max(15, captureFpsRef.current - 5));
            setPerfMode('low');
          } else if (fps < TARGET_FPS && perfModeRef.current === 'normal') {
            const newSize = Math.max(MIN_CANVAS_SIZE, size - 40);
            setCurrentCanvasSize(newSize);
            setCaptureFps(Math.max(20, captureFpsRef.current - 2));
            setPerfMode('medium');
          } else if (fps >= TARGET_FPS && perfModeRef.current !== 'normal') {
            const newSize = Math.min(MAX_CANVAS_SIZE, size + 40);
            setCurrentCanvasSize(newSize);
            setCaptureFps(Math.min(24, captureFpsRef.current + 2));
            setPerfMode('normal');
          }
        }

        const anchors = computeFaceAnchors(keypointsRef.current, vw, vh, size);

        // 1. Draw local transparent overlay canvas (renders active face props)
        const octx = overlayCtxRef.current;
        if (octx) {
          octx.clearRect(0, 0, size, size);
          
          activePropsRef.current.forEach((propId) => {
            const propDef = PROPS_LIST.find((p) => p.id === propId);
            if (!propDef) return;
            const img = propImagesRef.current[propId];
            if (img) {
              const transform = getPropTransform(propId, propDef, anchors, size);
              octx.save();
              octx.translate(transform.x, transform.y);
              octx.rotate(transform.rotation);
              octx.drawImage(img, -transform.width / 2, -transform.height / 2, transform.width, transform.height);
              octx.restore();
            }
          });
        }

        // 2. Draw composite WebRTC canvas (renders mirrored video stream + active face props)
        const cctx = compCtxRef.current;
        if (cctx) {
          cctx.save();
          cctx.translate(size, 0);
          cctx.scale(-1, 1);
          const filter = FILTERS.find((f) => f.id === filterIdRef.current);
          cctx.filter = filter ? filter.css : 'none';
          drawVideoCoverSquare(cctx, video, size);
          cctx.filter = 'none';

          activePropsRef.current.forEach((propId) => {
            const propDef = PROPS_LIST.find((p) => p.id === propId);
            if (!propDef) return;
            const img = propImagesRef.current[propId];
            if (img) {
              const transform = getPropTransform(propId, propDef, anchors, size);
              cctx.save();
              cctx.translate(transform.x, transform.y);
              cctx.rotate(transform.rotation);
              cctx.drawImage(img, -transform.width / 2, -transform.height / 2, transform.width, transform.height);
              cctx.restore();
            }
          });

          enhanceFrameRef.current = (enhanceFrameRef.current + 1) % ENHANCE_INTERVAL;
          if (enhanceFrameRef.current === 0) {
            enhancerRef.current.enhance(cctx, null, { isCapture: false });
          }

          cctx.restore();
        }
      }
      lastFrameTime = now;
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [localStream]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      cancelledRef.current = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
      if (remoteStream) remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && localStream && video.srcObject !== localStream) {
      video.srcObject = localStream;
      video.play().catch(() => {});
    }
  }, [localStream, permissionState]);

  useEffect(() => {
    if (permissionState === 'granted' && compositeCanvasRef.current && localStream && !outgoingStream) {
      const canvasStream = compositeCanvasRef.current.captureStream(captureFpsRef.current);
      setOutgoingStream(canvasStream);
    }
  }, [permissionState, localStream, outgoingStream]);

  const outgoingStreamRef = useRef(null);
  useEffect(() => { outgoingStreamRef.current = outgoingStream; }, [outgoingStream]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      outgoingStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const enableCamera = async () => {
    setPermissionState('requesting');
    setErrorMsg('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('denied');
      setErrorMsg('This browser blocks camera access unless the page is served over HTTPS or localhost.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      localStreamRef.current = stream;
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
      ctx.lineWidth = 2;
      roundRectPath(ctx, x, y, SHOT_W, SHOT_H, 14);
      ctx.stroke();

      const poseText = poses[i] ? `“${poses[i]}”` : '';
      if (poseText) {
        ctx.fillStyle = '#6A1B9A';
        ctx.font = "italic 500 20px 'Playfair Display', Georgia, serif";
        ctx.fillText(poseText, CARD_W / 2, y + SHOT_H + 24);
      }
      y += SHOT_H + CAPTION_H + MARGIN;
    }

    ctx.fillStyle = '#ad1457';
    ctx.font = '16px sans-serif';
    const now = new Date();
    const dateStr = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • Photobooth`;
    ctx.fillText(dateStr, CARD_W / 2, cardH - 24);

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const uploadStrip = async (stripDataUrl, poses) => {
    setSaving(true);
    setStatusMsg('Saving your strip to the gallery...');
    const result = await savePhotoboothStrip({
      author: partnerName,
      imageDataUrl: stripDataUrl,
      caption: `Photobooth strip: ${poses.join(' • ')}`,
    });
    setSaving(false);
    if (result.success) {
      setResultUrl(result.url);
      setStatusMsg('Saved to your Photo Booth gallery! 💖');
      sendEvent('session', { type: 'saved', url: result.url });
    } else {
      setStatusMsg(`Failed to save: ${result.error}`);
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

  const toggleProp = (propId) => {
    setActiveProps((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const clearAllProps = () => {
    setActiveProps([]);
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
            <span className="booth-picker-label">Props</span>
            {PROPS_LIST.map((p) => {
              const isActive = activeProps.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`booth-chip ${isActive ? 'active' : ''}`}
                  onClick={() => toggleProp(p.id)}
                >
                  {p.emoji} {p.label}
                </button>
              );
            })}
            {activeProps.length > 0 && (
              <button className="booth-chip" style={{ borderColor: '#FF4081', color: '#FF4081' }} onClick={clearAllProps}>
                🗑️ Clear All
              </button>
            )}
          </div>
        </div>
      )}

      <div className="booth-stage">
        <div className="booth-video-frame">
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
            width={currentCanvasSize}
            height={currentCanvasSize}
            className="booth-overlay-canvas"
          />
          <canvas
            ref={compositeCanvasRef}
            width={currentCanvasSize}
            height={currentCanvasSize}
            style={{ display: 'none' }}
          />

          {permissionState !== 'granted' && (
            <div className="booth-permission-overlay">
              {permissionState === 'idle' && (
                <>
                  <p>Ready to jump in? Allow camera access to start.</p>
                  <button className="btn-enable-cam" onClick={enableCamera}>
                    Enable Camera 📷
                  </button>
                </>
              )}
              {permissionState === 'requesting' && <p>Requesting camera access...</p>}
              {permissionState === 'denied' && (
                <>
                  <p style={{ color: '#FFCDD2', fontWeight: 600 }}>{errorMsg}</p>
                  <button className="btn-enable-cam" onClick={enableCamera}>
                    Retry Camera 📷
                  </button>
                </>
              )}
            </div>
          )}

          {sessionPhase === 'countdown' && (
            <div className="booth-countdown-overlay">
              {currentPose && <div className="booth-pose-banner">Pose: {currentPose}</div>}
              {currentCount !== null && <div className="booth-count-big">{currentCount}</div>}
            </div>
          )}
        </div>

        <div className="booth-video-frame remote-frame">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="booth-media" />
          ) : (
            <div className="booth-waiting-placeholder">
              <span className="pulse-heart">💓</span>
              <p>
                Waiting for {partnerName} to join...
                <br />
                <small>(Share page link with them)</small>
              </p>
            </div>
          )}
        </div>
      </div>

      {permissionState === 'granted' && (
        <>
          <div className="booth-connection-badge">
            Status:{' '}
            {connectionState === 'connected'
              ? `Connected with ${partnerName} 💕`
              : peerOnline
                ? `Connecting to ${partnerName}...`
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
              <button className="btn-start" onClick={startSession} disabled={connectionState !== 'connected'}>
                Start Photo Booth
              </button>
            </div>
          )}

          {sessionPhase === 'review' && (
            <div className="booth-result-card">
              {resultDataUrl && <img src={resultDataUrl} alt="Your photo strip" />}
              {resultUrl && <img src={resultUrl} alt="Your photo strip" />}
              <div className="booth-result-actions">
                <button className="btn-save" onClick={downloadResult}>
                  📥 Download Strip
                </button>
                <button className="btn-save" onClick={resetForAnother}>
                  🔁 Another Round
                </button>
              </div>
            </div>
          )}

          {statusMsg && <p className="booth-status">{statusMsg}</p>}
        </>
      )}
    </div>
  );
}