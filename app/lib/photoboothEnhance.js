export function createEnhancer(options = {}) {
  const {
    canvasSize = 480,
    scanSize = 160,
    historySize = 3,
    softSkinAlpha = 0.35,
    softSkinBlur = 2,
    lumaLowThreshold = 80,
    lumaHighThreshold = 140,
    enableTemporal = true,
    enableAutoContrast = true,
    enableSoftSkin = true,
  } = options;

  const history = [];
  let frameCount = 0;
  let lastLuma = 128;

  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = scanSize;
  scanCanvas.height = scanSize;
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

  function getLuma(imageData) {
    const data = imageData.data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return sum / (data.length / 4);
  }

  function buildLut(minL, maxL) {
    const lut = new Uint8Array(256);
    const range = Math.max(1, maxL - minL);
    for (let i = 0; i < 256; i++) {
      const v = (i - minL) / range;
      lut[i] = Math.round(Math.max(0, Math.min(255, v * 255)));
    }
    return lut;
  }

  function applyLut(ctx, lut) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function drawFaceMask(ctx, keypoints, size) {
    if (!keypoints) return null;
    const rightEye = keypoints[0];
    const leftEye = keypoints[1];
    const nose = keypoints[2];
    const mouth = keypoints[3];
    const rightEar = keypoints[4];
    const leftEar = keypoints[5];

    const eyeMidX = (rightEye.x + leftEye.x) / 2;
    const eyeMidY = (rightEye.y + leftEye.y) / 2;
    const faceW = Math.hypot(rightEar.x - leftEar.x, rightEar.y - leftEar.y) || size * 0.25;
    const eyeToMouth = Math.hypot(mouth.x - eyeMidX, mouth.y - eyeMidY) || faceW * 0.5;

    const cx = eyeMidX;
    const cy = eyeMidY + eyeToMouth * 0.3;
    const rx = faceW * 0.55;
    const ry = eyeToMouth * 0.9;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    return { cx, cy, rx, ry };
  }

  return {
    enhance(ctx, keypoints, opts = {}) {
      const {
        skipAutoContrast = false,
        skipSoftSkin = false,
        skipTemporal = false,
        isCapture = false,
      } = opts;

      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      frameCount++;

      if (enableTemporal && !skipTemporal && history.length > 0) {
        const alpha = 0.35;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(history[history.length - 1], 0, 0, w, h);
        ctx.restore();
      }

      let luma = lastLuma;
      if (enableAutoContrast && !skipAutoContrast) {
        scanCtx.drawImage(ctx.canvas, 0, 0, scanSize, scanSize);
        const scanData = scanCtx.getImageData(0, 0, scanSize, scanSize);
        luma = getLuma(scanData);
        lastLuma = luma;

        if (luma < lumaHighThreshold && luma > 10) {
          const minL = Math.max(0, luma * 0.3);
          const maxL = Math.min(255, luma * 1.8);
          const lut = buildLut(minL, maxL);
          applyLut(ctx, lut);
        }
      }

      if (enableSoftSkin && !skipSoftSkin && keypoints && luma < lumaHighThreshold) {
        const faceMask = drawFaceMask(ctx, keypoints, w);
        if (faceMask) {
          ctx.save();
          ctx.filter = `blur(${softSkinBlur}px)`;
          ctx.globalAlpha = softSkinAlpha;
          ctx.drawImage(ctx.canvas, 0, 0);
          ctx.restore();
        }
      }

      if (isCapture) {
        ctx.filter = 'contrast(1.06) saturate(1.08)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
      }

      if (enableTemporal && !skipTemporal) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        tempCanvas.getContext('2d').drawImage(ctx.canvas, 0, 0);
        history.push(tempCanvas);
        if (history.length > historySize) history.shift();
      }

      return { luma, frameCount };
    },

    reset() {
      history.length = 0;
      frameCount = 0;
      lastLuma = 128;
    },

    getStats() {
      return { frameCount, historyLength: history.length, lastLuma };
    },
  };
}

const filtersRef = { current: [] };

export function createOneEuroFilter(freq = 60, mincutoff = 1.0, beta = 0.0, dcutoff = 1.0) {
  let xPrev = 0;
  let dxPrev = 0;
  let tPrev = null;

  function alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  return function filter(t, x) {
    if (tPrev === null) {
      tPrev = t;
      xPrev = x;
      return x;
    }
    const dt = (t - tPrev) / 1000;
    const edx = alpha(dcutoff, dt) * (x - xPrev) / dt + (1 - alpha(dcutoff, dt)) * dxPrev;
    const cutoff = mincutoff + beta * Math.abs(edx);
    const ax = alpha(cutoff, dt);
    const xFiltered = ax * x + (1 - ax) * xPrev;
    tPrev = t;
    xPrev = xFiltered;
    dxPrev = edx;
    return xFiltered;
  };
}

export function createKeypointSmoothers(count = 6) {
  const smoothers = [];
  for (let i = 0; i < count; i++) {
    smoothers.push({
      x: createOneEuroFilter(60, 1.2, 0.3, 1.0),
      y: createOneEuroFilter(60, 1.2, 0.3, 1.0),
    });
  }
  return smoothers;
}

export function smoothKeypoints(keypoints, smoothers, timestamp) {
  if (!keypoints || !smoothers) return keypoints;
  return keypoints.map((kp, i) => {
    const s = smoothers[i];
    if (!s) return kp;
    return {
      x: s.x(timestamp, kp.x),
      y: s.y(timestamp, kp.y),
    };
  });
}