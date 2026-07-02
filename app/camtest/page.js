'use client';

import { useEffect, useRef, useState } from 'react';

// Bare-minimum camera test — no props, no WebRTC, no filters, no auth.
// If the camera shows here, the hardware/browser/permissions are fine and the
// problem is in the photobooth component. If it's black here too, the problem
// is environmental (device busy, blocked permission, driver).
export default function CamTest() {
  const videoRef = useRef(null);
  const [log, setLog] = useState([]);
  const [dims, setDims] = useState('—');

  const addLog = (msg) => setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${msg}`]);

  const start = async () => {
    addLog('Requesting camera...');
    if (!navigator.mediaDevices?.getUserMedia) {
      addLog('❌ getUserMedia is not available (page must be http://localhost or https).');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      addLog(`✅ Camera acquired: "${track.label}"`);
      addLog(`   settings: ${JSON.stringify(track.getSettings())}`);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().then(() => addLog('▶️ video.play() ok')).catch((e) => addLog(`⚠️ play() rejected: ${e.name}`));
      }
    } catch (e) {
      addLog(`❌ ERROR ${e.name}: ${e.message}`);
    }
  };

  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v) setDims(`readyState=${v.readyState} size=${v.videoWidth}x${v.videoHeight} paused=${v.paused}`);
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', color: '#222', background: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontFamily: 'monospace' }}>Camera Test</h1>
      <button onClick={start} style={{ padding: '10px 18px', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>
        ▶ Start Camera
      </button>
      <div style={{ marginBottom: 8 }}>Live: {dims}</div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: 480, height: 360, background: '#000', display: 'block', marginBottom: 16, transform: 'scaleX(-1)' }}
      />
      <pre style={{ background: '#111', color: '#0f0', padding: 12, maxWidth: 700, whiteSpace: 'pre-wrap' }}>
        {log.join('\n') || '(click Start Camera)'}
      </pre>
    </div>
  );
}
