'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addAlbumPhoto } from '../admin/actions';
import { getUserRole } from '../actions';
import './print.css';

export default function PrintPage() {
  const [mode, setMode] = useState('upload'); // 'upload' or 'webcam'
  const [caption, setCaption] = useState('');
  const [imageSrc, setImageSrc] = useState(null); // original image data URL
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDeveloped, setIsDeveloped] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dateStamp, setDateStamp] = useState('');

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const router = useRouter();

  // Check admin role
  useEffect(() => {
    const checkRole = async () => {
      try {
        const role = await getUserRole();
        setIsAdmin(role === 'admin');
      } catch (err) {
        setIsAdmin(false);
      }
    };
    checkRole();
  }, []);

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
      
      // Pitch transient
      const osc = ctx.createOscillator();
      const gainOsc = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.08);
      
      gainOsc.gain.setValueAtTime(0.6, ctx.currentTime);
      gainOsc.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.connect(gainOsc);
      gainOsc.connect(ctx.destination);
      
      // High-frequency shutter snap
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

  // Synthesize Instax printer eject motor hum using Web Audio API
  const playPrintSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Low motor frequency
      const osc = ctx.createOscillator();
      const gainOsc = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      
      // Modulator for mechanical clicking
      const lfo = ctx.createOscillator();
      const gainLfo = ctx.createGain();
      lfo.frequency.value = 13; // clicks/sec
      gainLfo.gain.value = 6;
      
      lfo.connect(gainLfo);
      gainLfo.connect(osc.frequency);
      
      // Print eject noise hum
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

  // Capture photo from webcam or trigger file print
  const handlePrintTrigger = () => {
    setErrorMsg('');
    setSuccessMsg('');

    let finalSrc = null;

    if (mode === 'webcam') {
      if (!isWebcamActive || !videoRef.current) {
        setErrorMsg('Webcam is not active.');
        return;
      }
      
      // Capture frame from webcam stream
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      
      // Mirror image for webcam preview comfort
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

    // Capture current date formatted like standard digicams: 'YY MM DD' or 'MM.DD.YY'
    const today = new Date();
    const yy = String(today.getFullYear()).substring(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDateStamp(`${mm}.${dd}.${yy}`);

    // Trigger visual/audio actions
    playShutterSound();
    setFlashActive(true);
    
    setTimeout(() => {
      setFlashActive(false);
      setIsPrinting(true);
      playPrintSound();
    }, 150);

    // Development lifecycle stages
    setTimeout(() => {
      setIsDeveloped(true);
    }, 4500); // develops during slide-out and finishes shortly after
  };

  // Draw Polaroid card to high quality HTML5 canvas to support local download/Supabase save
  const generatePolaroidCanvas = (callback) => {
    const cardW = 800;
    const cardH = 980;
    const canvas = document.createElement('canvas');
    canvas.width = cardW;
    canvas.height = cardH;
    const ctx = canvas.getContext('2d');

    // 1. Draw polaroid white background card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cardW, cardH);
    
    // Subtle border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, cardW, cardH);

    // 2. Draw photo inside (offset left: 45px, top: 45px, width: 710px, height: 650px)
    const imgObj = new Image();
    imgObj.crossOrigin = 'anonymous';
    imgObj.onload = () => {
      const imgW = 710;
      const imgH = 650;
      
      // Draw image inside photo boundary
      ctx.drawImage(imgObj, 45, 45, imgW, imgH);

      // Apply vintage camera photo filter using canvas compositing
      // Add a warm yellow-peach overlay tint to emulate digicam/retro tones
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(255, 230, 210, 0.25)'; // Soft peach/yellow
      ctx.fillRect(45, 45, imgW, imgH);
      
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(45, 45, imgW, imgH);
      
      ctx.globalCompositeOperation = 'source-over';

      // 3. Draw digicam neon orange stamp
      ctx.fillStyle = '#ff5500';
      ctx.shadowColor = '#ff5500';
      ctx.shadowBlur = 4;
      ctx.font = "900 24px 'Courier New', Courier, monospace";
      ctx.textAlign = 'right';
      ctx.fillText(dateStamp, 45 + imgW - 25, 45 + imgH - 25);
      
      // Reset shadows
      ctx.shadowBlur = 0;

      // 4. Draw handwritten caption & date
      ctx.fillStyle = '#3e2723';
      ctx.font = "38px 'Segoe Print', 'Comic Sans MS', cursive";
      ctx.textAlign = 'center';
      
      // Capitalize caption nicely
      const displayText = caption || 'A Special Memory';
      ctx.fillText(displayText, cardW / 2, 770);

      // Date string at the bottom
      ctx.fillStyle = '#a1887f';
      ctx.font = "bold 20px 'Quicksand', sans-serif";
      ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), cardW / 2, 850);

      callback(canvas.toDataURL('image/jpeg', 0.9));
    };
    imgObj.src = imageSrc;
  };

  // Save the developed Instax card directly to the shared Supabase Album
  const handleSaveToAlbum = async () => {
    if (!isAdmin) {
      setErrorMsg('Only an admin session can publish to the shared album.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      generatePolaroidCanvas(async (dataUrl) => {
        // Convert Data URL to file Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `instax_${Date.now()}.jpg`, { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('caption', caption || 'Instax Snapshot');
        formData.append('photo_date', new Date().toISOString().split('T')[0]);
        formData.append('category', 'monthly');

        const result = await addAlbumPhoto(formData);
        if (result.success) {
          setSuccessMsg('Your memory was printed and posted to the Album! 💖');
          router.refresh();
        } else {
          setErrorMsg('Failed to post printed memory.');
        }
        setIsSaving(false);
      });
    } catch (err) {
      setErrorMsg(`Error saving to album: ${err.message}`);
      setIsSaving(false);
    }
  };

  // Download the developed polaroid card locally to device
  const handleDownload = () => {
    generatePolaroidCanvas((dataUrl) => {
      const link = document.createElement('a');
      link.download = `Instax_${Date.now()}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMsg('Polaroid downloaded successfully! 📸');
    });
  };

  // Reset printer to take another photo
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
    <div className="print-page">
      <div className={`shutter-flash ${flashActive ? 'flash-active' : ''}`} />

      <div className="print-header">
        <h1 className="print-title">Instant Print Studio 📸</h1>
        <p className="print-sub">Click a picture or upload a memory to print it real-time.</p>
      </div>

      {errorMsg && <p className="login-error-msg" style={{ margin: '0 0 20px 0' }}>{errorMsg}</p>}
      {successMsg && <p className="login-success-msg" style={{ margin: '0 0 20px 0', background: 'rgba(230, 246, 230, 0.9)', color: '#2e7d32' }}>{successMsg}</p>}

      {/* Virtual Instax Camera */}
      <div className="instax-camera">
        <div className="camera-top-bar">
          <div className={`camera-flash-light ${isPrinting ? 'charging' : 'ready'}`} />
          <div className="camera-viewfinder-glass" />
          <button 
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
                style={{ transform: 'scaleX(-1)' }} // mirror view
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
                className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
                onClick={() => setMode('upload')}
              >
                Upload File
              </button>
              <button 
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
              placeholder="Write a sweet label..."
              className="camera-caption-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={40}
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
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action panel once print completes */}
      <div className={`print-actions ${isDeveloped ? 'actions-visible' : ''}`}>
        <button className="btn-save" onClick={handleDownload}>
          💾 Download Polaroid
        </button>
        
        {isAdmin && (
          <button 
            className="btn-save" 
            style={{ background: '#db407a' }}
            onClick={handleSaveToAlbum}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : '💕 Post to Scrapbook'}
          </button>
        )}
        
        <button className="btn-reset" onClick={handleReset}>
          🔄 Print New
        </button>
      </div>
    </div>
  );
}
