'use client';

import { useEffect, useRef, useState } from 'react';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const DETECT_INTERVAL_MS = 90;

let consolePatched = false;
function silenceMediapipeInfoLogs() {
  if (consolePatched || typeof window === 'undefined') return;
  consolePatched = true;
  const originalError = console.error;
  console.error = (...args) => {
    const first = args[0];
    if (typeof first === 'string' && (first.includes('TensorFlow Lite') || first.startsWith('INFO:'))) {
      return;
    }
    originalError(...args);
  };
}

class OneEuroFilter {
  constructor(freq = 60, mincutoff = 1.0, beta = 0.3, dcutoff = 1.0) {
    this.freq = freq;
    this.mincutoff = mincutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  alpha(cutoff) {
    const te = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(t, x) {
    if (this.xPrev === null) {
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = t;
      return x;
    }
    const dt = t - this.tPrev;
    if (dt <= 0) return this.xPrev;
    this.freq = 1000.0 / dt;
    const dx = (x - this.xPrev) * this.freq;
    const edx = this.alpha(this.dcutoff) * dx + (1 - this.alpha(this.dcutoff)) * this.dxPrev;
    const cutoff = this.mincutoff + this.beta * Math.abs(edx);
    const xFiltered = this.alpha(cutoff) * x + (1 - this.alpha(cutoff)) * this.xPrev;
    this.xPrev = xFiltered;
    this.dxPrev = edx;
    this.tPrev = t;
    return xFiltered;
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

let detectorPromise = null;
function loadDetector() {
  if (!detectorPromise) {
    silenceMediapipeInfoLogs();
    detectorPromise = import('@mediapipe/tasks-vision').then(async (vision) => {
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(WASM_URL);
      return vision.FaceDetector.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      });
    });
  }
  return detectorPromise;
}

function createKeypointSmoothers(count = 6) {
  const smoothers = [];
  for (let i = 0; i < count; i++) {
    smoothers.push({
      x: new OneEuroFilter(60, 1.2, 0.3, 1.0),
      y: new OneEuroFilter(60, 1.2, 0.3, 1.0),
    });
  }
  return smoothers;
}

function smoothKeypoints(rawKeypoints, smoothers, timestamp) {
  if (!rawKeypoints || !smoothers) return rawKeypoints;
  return rawKeypoints.map((kp, i) => {
    const s = smoothers[i];
    if (!s) return kp;
    return {
      x: s.x.filter(timestamp, kp.x),
      y: s.y.filter(timestamp, kp.y),
    };
  });
}

export function useFaceTracker(videoRef, enabled) {
  const [keypoints, setKeypoints] = useState(null);
  const rafRef = useRef(null);
  const lastRunRef = useRef(0);
  const detectorRef = useRef(null);
  const smoothersRef = useRef(null);
  const lastDetectedRef = useRef(null);
  const lastDetectedTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setKeypoints(null);
      smoothersRef.current = null;
      lastDetectedRef.current = null;
      return undefined;
    }

    let cancelled = false;

    loadDetector()
      .then((detector) => {
        if (cancelled) return;
        detectorRef.current = detector;

        const loop = (t) => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2 && t - lastRunRef.current > DETECT_INTERVAL_MS) {
            lastRunRef.current = t;
            try {
              const result = detectorRef.current.detectForVideo(video, performance.now());
              if (result?.detections?.length) {
                const raw = result.detections[0].keypoints;
                if (!smoothersRef.current) {
                  smoothersRef.current = createKeypointSmoothers(raw.length);
                }
                const now = performance.now();
                const smoothed = smoothKeypoints(raw, smoothersRef.current, now);
                lastDetectedRef.current = smoothed;
                lastDetectedTimeRef.current = now;
                setKeypoints(smoothed);
              } else if (lastDetectedRef.current && smoothersRef.current) {
                const now = performance.now();
                const dt = now - lastDetectedTimeRef.current;
                if (dt < 500) {
                  const predicted = lastDetectedRef.current.map((kp, i) => {
                    const s = smoothersRef.current[i];
                    return { x: s.x.filter(now, kp.x), y: s.y.filter(now, kp.y) };
                  });
                  setKeypoints(predicted);
                }
              }
            } catch {
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch((err) => console.error('Face tracker failed to load:', err));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, videoRef]);

  return keypoints;
}