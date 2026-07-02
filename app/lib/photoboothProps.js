// Lightweight canvas filters + face-tracked prop overlays for the photo booth.
// No image assets are loaded — everything is drawn with canvas paths + emoji
// glyphs so this stays cheap on low-end hardware and works fully offline
// once the page has loaded.

export const FILTERS = [
  { id: 'none', label: 'No Filter', css: 'none' },
  { id: 'warm', label: 'Instax Warm', css: 'contrast(1.08) saturate(1.15) brightness(1.05) sepia(0.08)' },
  { id: 'bw', label: 'Black & White', css: 'grayscale(1) contrast(1.1)' },
  { id: 'pastel', label: 'Pastel', css: 'saturate(0.85) brightness(1.1) contrast(0.95)' },
];

export const PROPS = [
  { id: 'none', label: 'No Prop', emoji: '✋' },
  { id: 'crown', label: 'Flower Crown', emoji: '🌸' },
  { id: 'bunny', label: 'Bunny Ears', emoji: '🐰' },
  { id: 'heart-eyes', label: 'Heart Eyes', emoji: '😍' },
  { id: 'blush', label: 'Sparkle Blush', emoji: '✨' },
];

// MediaPipe's short-range BlazeFace detector returns 6 normalized keypoints
// in this fixed order: rightEye, leftEye, noseTip, mouthCenter,
// rightEarTragion, leftEarTragion. Coordinates are 0..1 relative to the
// video frame that was fed into the detector.
const KP = { RIGHT_EYE: 0, LEFT_EYE: 1, NOSE: 2, MOUTH: 3, RIGHT_EAR: 4, LEFT_EAR: 5 };

// The detector's keypoints are normalized 0..1 against the *full* camera
// frame, but we only draw a center-cropped square of that frame onto the
// canvas — so keypoints must be re-projected into that cropped square's
// coordinate space before they'll line up with the visible face.
export function mapKeypointsToSquare(keypoints, videoWidth, videoHeight, destSize) {
  if (!keypoints || !videoWidth || !videoHeight) return null;
  const cropSize = Math.min(videoWidth, videoHeight);
  const offsetX = (videoWidth - cropSize) / 2;
  const offsetY = (videoHeight - cropSize) / 2;
  return keypoints.map((kp) => ({
    x: ((kp.x * videoWidth - offsetX) / cropSize) * destSize,
    y: ((kp.y * videoHeight - offsetY) / cropSize) * destSize,
  }));
}

function toPoint(keypoints, index) {
  return keypoints[index] || null;
}

export function drawProp(ctx, propId, mappedKeypoints) {
  if (!propId || propId === 'none' || !mappedKeypoints || mappedKeypoints.length < 6) return;

  const rightEye = toPoint(mappedKeypoints, KP.RIGHT_EYE);
  const leftEye = toPoint(mappedKeypoints, KP.LEFT_EYE);
  const mouth = toPoint(mappedKeypoints, KP.MOUTH);
  const rightEar = toPoint(mappedKeypoints, KP.RIGHT_EAR);
  const leftEar = toPoint(mappedKeypoints, KP.LEFT_EAR);
  if (!rightEye || !leftEye || !mouth || !rightEar || !leftEar) return;

  const eyeMidX = (rightEye.x + leftEye.x) / 2;
  const eyeMidY = (rightEye.y + leftEye.y) / 2;
  const faceWidth = Math.hypot(rightEar.x - leftEar.x, rightEar.y - leftEar.y) || 120;
  const eyeToMouth = Math.hypot(mouth.x - eyeMidX, mouth.y - eyeMidY) || faceWidth * 0.5;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (propId === 'crown') {
    const size = faceWidth * 0.55;
    const y = eyeMidY - faceWidth * 0.55;
    ctx.font = `${size}px serif`;
    ctx.fillText('👑', eyeMidX, y);
    ctx.font = `${size * 0.55}px serif`;
    ctx.fillText('🌸', eyeMidX - size * 0.55, y + size * 0.12);
    ctx.fillText('🌸', eyeMidX + size * 0.55, y + size * 0.12);
  } else if (propId === 'bunny') {
    const earW = faceWidth * 0.22;
    const earH = eyeToMouth * 2.1;
    [
      { x: rightEar.x - faceWidth * 0.08, y: rightEar.y, tilt: -0.15 },
      { x: leftEar.x + faceWidth * 0.08, y: leftEar.y, tilt: 0.15 },
    ].forEach(({ x, y, tilt }) => {
      ctx.save();
      ctx.translate(x, y - earH * 0.55);
      ctx.rotate(tilt);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(0, 0, earW / 2, earH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8bbd0';
      ctx.beginPath();
      ctx.ellipse(0, earH * 0.05, earW / 3.2, earH / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  } else if (propId === 'heart-eyes') {
    const size = faceWidth * 0.4;
    ctx.font = `${size}px serif`;
    ctx.fillText('❤️', rightEye.x, rightEye.y);
    ctx.fillText('❤️', leftEye.x, leftEye.y);
  } else if (propId === 'blush') {
    const cheekOffsetX = faceWidth * 0.28;
    const cheekY = eyeMidY + eyeToMouth * 0.55;
    [rightEye.x - cheekOffsetX * 0.2, leftEye.x + cheekOffsetX * 0.2].forEach((cx) => {
      const grad = ctx.createRadialGradient(cx, cheekY, 2, cx, cheekY, faceWidth * 0.18);
      grad.addColorStop(0, 'rgba(255, 130, 160, 0.55)');
      grad.addColorStop(1, 'rgba(255, 130, 160, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cheekY, faceWidth * 0.18, 0, Math.PI * 2);
      ctx.fill();
    });
    const sparkleSize = faceWidth * 0.18;
    ctx.font = `${sparkleSize}px serif`;
    ctx.fillText('✨', eyeMidX - faceWidth * 0.5, eyeMidY - faceWidth * 0.3);
    ctx.fillText('✨', eyeMidX + faceWidth * 0.5, eyeMidY - faceWidth * 0.25);
  }

  ctx.restore();
}
