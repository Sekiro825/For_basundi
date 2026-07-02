'use client';

import { useEffect, useRef, useState } from 'react';

// Wraps MediaPipe's lightweight short-range BlazeFace detector (~200KB model,
// no GPU required) instead of the much heavier full FaceLandmarker mesh —
// this is the whole reason props stay smooth on low-end laptops. The
// package itself is only imported when the booth is actually opened.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const DETECT_INTERVAL_MS = 90; // ~11fps detection is plenty for prop tracking

// MediaPipe's WASM runtime logs routine startup info (e.g. "Created
// TensorFlow Lite XNNPACK delegate for CPU") through console.error instead of
// console.log/info, which makes Next.js's dev overlay flag it as a crash even
// though nothing failed. Filter out just that known-benign noise.
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

// Returns the latest set of face keypoints ({x,y} normalized 0..1, 6 points)
// detected from the given video element, or null until the first detection.
export function useFaceTracker(videoRef, enabled) {
  const [keypoints, setKeypoints] = useState(null);
  const rafRef = useRef(null);
  const lastRunRef = useRef(0);
  const detectorRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setKeypoints(null);
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
                setKeypoints(result.detections[0].keypoints);
              }
            } catch {
              // Transient decode errors are fine to skip a frame on.
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
