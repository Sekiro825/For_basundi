'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { makeInstax } from './instax';
import { addAlbumPhotoFromUser, addComment, toggleReaction } from './actions';

const REACTION_EMOJIS = ['❤️', '😍', '🥺', '😂', '🔥', '🌸', '💋'];

function authorName(role) {
  if (role === 'admin') return 'saket';
  if (role === 'user') return 'grishma';
  return null;
}
function prettyName(author) {
  return author === 'saket' ? 'Saket' : 'Grishma';
}

// ---------- Bunting + fairy lights ("patakas") ----------
function Patakas() {
  const flagColors = ['#F48FB1', '#D4AF37', '#C2185B', '#F8BBD0', '#FFD54F', '#EC407A'];
  const flags = Array.from({ length: 14 });
  const bulbs = Array.from({ length: 26 });
  return (
    <div className="patakas" aria-hidden="true">
      <div className="fairy-string">
        {bulbs.map((_, i) => (
          <span
            key={i}
            className="fairy-bulb"
            style={{ '--i': i, animationDelay: `${(i % 5) * 0.3}s` }}
          />
        ))}
      </div>
      <div className="bunting">
        {flags.map((_, i) => (
          <span
            key={i}
            className="bunting-flag"
            style={{
              color: flagColors[i % flagColors.length],
              animationDelay: `${(i % 6) * 0.25}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- A single instax print pinned to the wall ----------
function PrintCard({ photo, index, comments, reactions, userRole, refresh }) {
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);

  const me = authorName(userRole);
  const tilt = (index % 2 === 0 ? 1 : -1) * (((index % 4) + 1) * 0.9);

  // group reactions by emoji
  const grouped = useMemo(() => {
    const g = {};
    (reactions || []).forEach((r) => {
      (g[r.emoji] ||= []).push(r.author);
    });
    return g;
  }, [reactions]);

  const handleReact = async (emoji) => {
    if (!me || busy) return;
    setBusy(true);
    try {
      await toggleReaction(photo.id, emoji);
      refresh();
    } catch (e) {
      // silent
    } finally {
      setBusy(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !me || busy) return;
    setBusy(true);
    try {
      await addComment(photo.id, commentText);
      setCommentText('');
      refresh();
    } catch (e) {
      // silent
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`journey-stop ${index % 2 === 0 ? 'stop-left' : 'stop-right'}`}
      style={{ animationDelay: `${(index % 6) * 0.08}s` }}
    >
      <span className="journey-node" />
      <div className="instax-pin">
        <span className="clothespin" />
        <div className="instax-print" style={{ '--tilt': `${tilt}deg` }}>
          {/* The image is already baked into instax format on upload, but
              older photos still get a clean white frame here. */}
          <div className="instax-photo">
            <img src={photo.image_url} alt={photo.caption || 'A memory of us'} />
          </div>
          {photo.caption && <p className="instax-caption">{photo.caption}</p>}
          <div className="instax-meta">
            <span className={`who who-${photo.author || 'saket'}`}>
              {photo.author === 'grishma' ? '💗 Grishma' : '💙 Saket'}
            </span>
            {photo.photo_date && (
              <span className="when">
                {new Date(photo.photo_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* reaction summary */}
          {Object.keys(grouped).length > 0 && (
            <div className="reaction-summary">
              {Object.entries(grouped).map(([emoji, who]) => (
                <span
                  key={emoji}
                  className="reaction-chip"
                  title={who.map(prettyName).join(' & ')}
                >
                  {emoji} {who.length > 1 ? who.length : ''}
                </span>
              ))}
            </div>
          )}

          {me && (
            <div className="reaction-bar">
              {REACTION_EMOJIS.map((emoji) => {
                const active = (grouped[emoji] || []).includes(me);
                return (
                  <button
                    key={emoji}
                    className={`react-btn ${active ? 'react-active' : ''}`}
                    onClick={() => handleReact(emoji)}
                    disabled={busy}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          <button className="comment-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide notes' : `💬 ${comments?.length || 0} note${(comments?.length || 0) === 1 ? '' : 's'}`}
          </button>

          {open && (
            <div className="comment-area fade-in">
              <div className="comment-list">
                {(comments || []).length === 0 && (
                  <p className="comment-empty">Be the first to leave a little note 💕</p>
                )}
                {(comments || []).map((c) => (
                  <div key={c.id} className={`comment comment-${c.author}`}>
                    <span className="comment-author">
                      {c.author === 'grishma' ? '💗 Grishma' : '💙 Saket'}
                    </span>
                    <span className="comment-text">{c.comment_text}</span>
                  </div>
                ))}
              </div>
              {me && (
                <form className="comment-form" onSubmit={handleComment}>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={`Write a note, ${prettyName(me)}...`}
                    className="comment-input"
                  />
                  <button type="submit" disabled={busy || !commentText.trim()} className="comment-send">
                    Send 💌
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Upload station (Instax Camera Studio) ----------
function UploadStation({ userRole, refresh }) {
  const [mode, setMode] = useState('upload'); // 'upload' or 'webcam'
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState('');
  const [imageSrc, setImageSrc] = useState(null); // original image data URL
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDeveloped, setIsDeveloped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dateStamp, setDateStamp] = useState(''); // digicam neon orange date: MM.DD.YY

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const me = authorName(userRole);
  if (!me) return null;

  // Handle webcam toggle
  useEffect(() => {
    if (mode === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [mode]);

  const startWebcam = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 640 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsWebcamActive(true);
      }
    } catch (err) {
      setErrorMsg('Could not access webcam. Please verify permissions or use file upload.');
      setMode('upload');
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setErrorMsg('');
      setSuccessMsg('');
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Synthesize camera shutter click using Web Audio API
  const playShutterSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainOsc = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.08);
      
      gainOsc.gain.setValueAtTime(0.6, ctx.currentTime);
      gainOsc.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.connect(gainOsc);
      gainOsc.connect(ctx.destination);
      
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1200;
      
      const gainNoise = ctx.createGain();
      gainNoise.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNoise.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      noise.connect(filter);
      filter.connect(gainNoise);
      gainNoise.connect(ctx.destination);
      
      osc.start();
      noise.start();
      osc.stop(ctx.currentTime + 0.08);
      noise.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.error('Audio synthesis failed:', e);
    }
  };

  // Synthesize Instax printer eject motor hum
  const playPrintSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainOsc = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      
      const lfo = ctx.createOscillator();
      const gainLfo = ctx.createGain();
      lfo.frequency.value = 13;
      gainLfo.gain.value = 6;
      
      lfo.connect(gainLfo);
      gainLfo.connect(osc.frequency);
      
      const noiseSize = ctx.sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 450;
      noiseFilter.Q.value = 1.2;
      
      const gainNoise = ctx.createGain();
      gainNoise.gain.setValueAtTime(0.03, ctx.currentTime);
      gainNoise.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 3.2);
      gainNoise.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(gainNoise);
      gainNoise.connect(ctx.destination);
      
      gainOsc.gain.setValueAtTime(0.15, ctx.currentTime);
      gainOsc.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 3.2);
      gainOsc.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);
      
      osc.connect(gainOsc);
      gainOsc.connect(ctx.destination);
      
      lfo.start();
      osc.start();
      noise.start();
      
      lfo.stop(ctx.currentTime + 3.5);
      osc.stop(ctx.currentTime + 3.5);
      noise.stop(ctx.currentTime + 3.5);
    } catch (e) {
      console.error('Audio synthesis failed:', e);
    }
  };

  const handlePrintTrigger = () => {
    setErrorMsg('');
    setSuccessMsg('');

    let finalSrc = null;

    if (mode === 'webcam') {
      if (!isWebcamActive || !videoRef.current) {
        setErrorMsg('Webcam is not active.');
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      
      ctx.translate(800, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, 800, 800);
      
      finalSrc = canvas.toDataURL('image/jpeg', 0.9);
      setImageSrc(finalSrc);
    } else {
      if (!imageSrc) {
        setErrorMsg('Please select a photo first.');
        return;
      }
      finalSrc = imageSrc;
    }

    let dateObj = new Date();
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    const yy = String(dateObj.getFullYear()).substring(2);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    setDateStamp(`${mm}.${dd}.${yy}`);

    playShutterSound();
    setFlashActive(true);
    
    setTimeout(() => {
      setFlashActive(false);
      setIsPrinting(true);
      playPrintSound();
    }, 150);

    setTimeout(() => {
      setIsDeveloped(true);
    }, 4500);
  };

  const handleSaveToAlbum = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { blob } = await makeInstax(imageSrc, caption, date || new Date().toISOString().split('T')[0]);

      const fd = new FormData();
      fd.append('file', blob, `instax_${Date.now()}.jpg`);
      fd.append('caption', caption || 'Instax Snapshot');
      fd.append('photo_date', date || new Date().toISOString().split('T')[0]);

      const result = await addAlbumPhotoFromUser(fd);
      if (result.success) {
        setSuccessMsg('Pinned to our wall! 📸✨');
        setTimeout(() => {
          handleReset();
          refresh();
        }, 1500);
      } else {
        setErrorMsg('Failed to post printed memory.');
      }
    } catch (err) {
      setErrorMsg(`Error saving to album: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { previewUrl } = await makeInstax(imageSrc, caption, date || new Date().toISOString().split('T')[0]);
      const link = document.createElement('a');
      link.download = `Instax_${Date.now()}.jpg`;
      link.href = previewUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMsg('Polaroid downloaded successfully! 📸');
    } catch (err) {
      setErrorMsg('Failed to generate download.');
    }
  };

  const handleReset = () => {
    if (mode === 'upload') {
      setImageSrc(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setCaption('');
    setIsPrinting(false);
    setIsDeveloped(false);
    setDateStamp('');
    setSuccessMsg('');
    setErrorMsg('');
  };

  return (
    <div className="upload-station">
      <div className="upload-paper" style={{ maxWidth: '440px' }}>
        <div className={`shutter-flash ${flashActive ? 'flash-active' : ''}`} />

        <h3 className="upload-title">Add to our journey ✨</h3>
        <p className="upload-sub">
          Snap a live photo or upload one, {prettyName(me)} — it turns into an instax print automatically.
        </p>

        {errorMsg && <p className="upload-status" style={{ color: '#d32f2f', margin: '0 0 10px 0' }}>{errorMsg}</p>}
        {successMsg && <p className="upload-status" style={{ color: '#2e7d32', margin: '0 0 10px 0' }}>{successMsg}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Virtual Instax Camera */}
          <div className="instax-camera">
            <div className="camera-top-bar">
              <div className={`camera-flash-light ${isPrinting ? 'charging' : 'ready'}`} />
              <div className="camera-viewfinder-glass" />
              <button 
                type="button"
                className="camera-shutter-btn"
                onClick={handlePrintTrigger}
                disabled={isPrinting}
                title="Snap & Print!"
              />
            </div>

            <div className="camera-brand-text">instax mini</div>

            {/* Viewfinder Lens */}
            <div className="camera-lens">
              <div className="lens-reflection" />
              <div className="camera-lens-glass">
                {mode === 'webcam' ? (
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline
                    className="webcam-stream"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div className="uploaded-preview-container" style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}>
                    {imageSrc ? (
                      <img src={imageSrc} alt="Preview" className="webcam-stream" style={{ borderRadius: '50%' }} />
                    ) : (
                      <span style={{ color: '#fff', fontSize: '0.8rem', textAlign: 'center', padding: '10px' }}>No Photo Selected</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mode Toggles & Inputs */}
            {!isPrinting && (
              <div className="camera-controls-panel">
                <div className="camera-mode-toggle">
                  <button 
                    type="button"
                    className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
                    onClick={() => setMode('upload')}
                  >
                    Upload File
                  </button>
                  <button 
                    type="button"
                    className={`mode-btn ${mode === 'webcam' ? 'active' : ''}`}
                    onClick={() => setMode('webcam')}
                  >
                    Webcam Mode
                  </button>
                </div>

                {mode === 'upload' && (
                  <label className="custom-file-upload">
                    📂 Choose Photo
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept="image/*" 
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}

                <input 
                  type="text" 
                  placeholder="A little caption..."
                  className="camera-caption-input"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={40}
                />
                
                <input 
                  type="date"
                  className="camera-caption-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  title="Photo Date (defaults to today)"
                />
              </div>
            )}

            {/* Shutter Eject Slot */}
            <div className="camera-print-slot" />
          </div>

          {/* Printing slide-down conveyor zone */}
          <div className={`printer-track ${isPrinting ? 'printing-active' : ''}`}>
            {isPrinting && (
              <div className={`polaroid-dev-card ${isPrinting ? 'print-slide-down' : ''}`}>
                <div className="polaroid-dev-img-wrap">
                  <img 
                    src={imageSrc} 
                    alt="Developing Print" 
                    className={`polaroid-dev-img ${isDeveloped ? 'developing-active' : ''}`}
                  />
                  <span className={`digicam-date-stamp ${isDeveloped ? 'stamp-visible' : ''}`}>
                    {dateStamp}
                  </span>
                </div>
                
                <div className="polaroid-dev-text">
                  <p className={`polaroid-dev-caption ${isDeveloped ? 'typing-active' : ''}`}>
                    {caption || 'A Special Memory'}
                  </p>
                  <span className={`polaroid-dev-date ${isDeveloped ? 'date-visible' : ''}`}>
                    {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action panel once print completes */}
          <div className={`print-actions ${isDeveloped ? 'actions-visible' : ''}`} style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }}>
            <button type="button" className="btn-save" onClick={handleSaveToAlbum} disabled={isSaving} style={{ background: '#db407a' }}>
              {isSaving ? 'Pinning...' : '📌 Pin to wall'}
            </button>
            <button type="button" className="btn-save" onClick={handleDownload}>
              💾 Download
            </button>
            <button type="button" className="btn-reset" onClick={handleReset}>
              🔄 Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlbumClient({ photos, commentsByPhoto, reactionsByPhoto, userRole }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="album-page journey-wall">
      <Patakas />

      <header className="journey-header">
        <h1 className="journey-title">Our Journey</h1>
        <p className="journey-sub">
          A wall of all our little moments, Grishma 💗 — every photo, every note.
        </p>
      </header>

      <UploadStation userRole={userRole} refresh={refresh} />

      <div className="journey-path">
        {(!photos || photos.length === 0) && (
          <p className="no-photos">No photos yet… time to make some memories!</p>
        )}
        {photos?.map((photo, index) => (
          <PrintCard
            key={photo.id}
            photo={photo}
            index={index}
            comments={commentsByPhoto[photo.id]}
            reactions={reactionsByPhoto[photo.id]}
            userRole={userRole}
            refresh={refresh}
          />
        ))}
        <div className="journey-end">
          <span className="journey-end-heart">❦</span>
          <p>to be continued…</p>
        </div>
      </div>
    </div>
  );
}
