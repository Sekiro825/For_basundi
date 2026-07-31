// Lightweight canvas filters + face-tracked prop overlays for the photo booth.
// High-quality 3D transparent overlays with real-time spring-damper physics.

export const FILTERS = [
  { id: 'none', label: 'No Filter', css: 'none' },
  { id: 'warm', label: 'Instax Warm', css: 'contrast(1.12) saturate(1.25) brightness(1.06) sepia(0.18) hue-rotate(-6deg)' },
  { id: 'bw', label: 'Black & White', css: 'grayscale(1) contrast(1.25) brightness(1.03)' },
  { id: 'pastel', label: 'Pastel', css: 'saturate(0.7) brightness(1.14) contrast(0.88) hue-rotate(-4deg)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.55) contrast(1.18) brightness(1.02)' },
  { id: 'cool', label: 'Cool Blue', css: 'saturate(1.1) contrast(1.08) brightness(1.03) hue-rotate(12deg)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.4) saturate(1.3) contrast(0.92) brightness(1.02) hue-rotate(-8deg)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.5) brightness(0.9)' },
];

export const PROPS = [
  { id: 'none', label: 'No Prop', emoji: '✋' },
  { id: 'bunny', label: 'Fluffy Bunny', emoji: '🐰' },
  { id: 'crown', label: 'Gold Crown', emoji: '👑' },
  { id: 'flower', label: 'Flower Crown', emoji: '🌸' },
  { id: 'heart-glasses', label: 'Heart Glasses', emoji: '👓' },
  { id: 'retro-glasses', label: 'Retro Glasses', emoji: '🕶️' },
  { id: 'angel', label: 'Angel Halo', emoji: '👼' },
  { id: 'blush', label: 'Sparkle Blush', emoji: '✨' },
];

export const PROPS_LIST = PROPS;

const KP = { RIGHT_EYE: 0, LEFT_EYE: 1, NOSE: 2, MOUTH: 3, RIGHT_EAR: 4, LEFT_EAR: 5 };

// Image assets preloader
const propImages = {};
if (typeof window !== 'undefined') {
  const sources = {
    bunny: '/assets/bunny_ears.png',
    crown: '/assets/gold_crown.png',
    flower: '/assets/flower_crown.png',
    'heart-glasses': '/assets/heart_glasses.png',
    'retro-glasses': '/assets/retro_glasses.png',
    angel: '/assets/angel_halo.png',
  };
  Object.entries(sources).forEach(([id, src]) => {
    const img = new Image();
    img.src = src;
    propImages[id] = img;
  });
}

// Physics configuration for spring-damper simulations
const PHYSICS_CONFIG = {
  bunny: {
    right: { springK: 140, damping: 9.5, inertia: 24, gravity: 0.12, restTilt: -0.12, maxOffset: 0.65 },
    left:  { springK: 150, damping: 10, inertia: 26, gravity: 0.12, restTilt: 0.12, maxOffset: 0.65 }
  },
  crown: { springK: 260, damping: 18, inertia: 12, gravity: 0.08, restTilt: 0.0, maxOffset: 0.25 },
  flower: { springK: 220, damping: 16, inertia: 14, gravity: 0.06, restTilt: 0.0, maxOffset: 0.25 },
  angel: { springK: 180, damping: 12, inertia: 16, gravity: 0.04, restTilt: 0.0, maxOffset: 0.35 },
  glasses: { springK: 350, damping: 24, inertia: 8, maxOffset: 0.2 }
};

// Physics state tracking
const physicsState = {
  lastTime: null,
  activePropId: null,
  bunny: {
    right: { angle: -0.12, angularVelocity: 0, lastBaseX: null, lastBaseY: null },
    left:  { angle: 0.12, angularVelocity: 0, lastBaseX: null, lastBaseY: null }
  },
  crown: { angle: 0.0, angularVelocity: 0, lastBaseX: null, lastBaseY: null },
  flower: { angle: 0.0, angularVelocity: 0, lastBaseX: null, lastBaseY: null },
  angel: { angle: 0.0, angularVelocity: 0, phase: 0, lastBaseX: null, lastBaseY: null },
  glasses: { angle: 0.0, angularVelocity: 0, lastBaseX: null, lastBaseY: null }
};

let lastUpdateFrameTime = 0;

function checkAndResetPhysics(propId) {
  if (physicsState.activePropId !== propId) {
    physicsState.activePropId = propId;
    physicsState.lastTime = null;
    lastUpdateFrameTime = 0;
    
    physicsState.bunny.right = { angle: -0.12, angularVelocity: 0, lastBaseX: null, lastBaseY: null };
    physicsState.bunny.left = { angle: 0.12, angularVelocity: 0, lastBaseX: null, lastBaseY: null };
    physicsState.crown = { angle: 0.0, angularVelocity: 0, lastBaseX: null, lastBaseY: null };
    physicsState.flower = { angle: 0.0, angularVelocity: 0, lastBaseX: null, lastBaseY: null };
    physicsState.angel = { angle: 0.0, angularVelocity: 0, phase: 0, lastBaseX: null, lastBaseY: null };
    physicsState.glasses = { angle: 0.0, angularVelocity: 0, lastBaseX: null, lastBaseY: null };
  }
}

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
  const eyeDistance = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y) || (faceWidth * 0.45);
  const eyeToMouth = Math.hypot(mouth.x - eyeMidX, mouth.y - eyeMidY) || faceWidth * 0.5;

  // Frame physics update
  checkAndResetPhysics(propId);
  const now = performance.now();
  let dt = 0;
  if (physicsState.lastTime !== null) {
    dt = (now - physicsState.lastTime) / 1000;
  }
  if (dt > 0.1) dt = 0.1;

  const isNewFrame = (now - lastUpdateFrameTime) > 4;

  if (isNewFrame && dt > 0) {
    physicsState.lastTime = now;
    lastUpdateFrameTime = now;
    const headAngle = Math.atan2(leftEar.y - rightEar.y, leftEar.x - rightEar.x);

    // 1. Bunny ears physics
    if (propId === 'bunny') {
      ['right', 'left'].forEach((side) => {
        const cfg = PHYSICS_CONFIG.bunny[side];
        const state = physicsState.bunny[side];
        const bx = side === 'right' ? rightEar.x - faceWidth * 0.05 : leftEar.x + faceWidth * 0.05;
        const by = side === 'right' ? rightEar.y : leftEar.y;

        let vx_normalized = 0;
        let vy_normalized = 0;
        if (state.lastBaseX !== null) {
          vx_normalized = (bx - state.lastBaseX) / (dt * faceWidth);
          vy_normalized = (by - state.lastBaseY) / (dt * faceWidth);
        }
        state.lastBaseX = bx;
        state.lastBaseY = by;

        const targetAngle = headAngle + cfg.restTilt;
        const torqueSpring = -cfg.springK * (state.angle - targetAngle);
        const torqueDamping = -cfg.damping * state.angularVelocity;
        const perpVel = vx_normalized * Math.cos(state.angle) + vy_normalized * Math.sin(state.angle);
        const torqueInertia = -cfg.inertia * perpVel;
        const torqueGravity = -cfg.gravity * Math.sin(state.angle);

        state.angularVelocity += (torqueSpring + torqueDamping + torqueInertia + torqueGravity) * dt;
        state.angle += state.angularVelocity * dt;

        const minAngle = targetAngle - cfg.maxOffset;
        const maxAngle = targetAngle + cfg.maxOffset;
        if (state.angle > maxAngle) {
          state.angle = maxAngle;
          state.angularVelocity = 0;
        } else if (state.angle < minAngle) {
          state.angle = minAngle;
          state.angularVelocity = 0;
        }
      });
    }

    // 2. Crown / Flower Crown / Angel Halo / Glasses physics
    if (propId === 'crown' || propId === 'flower' || propId === 'angel') {
      const cfg = PHYSICS_CONFIG[propId];
      const state = physicsState[propId];
      const bx = eyeMidX;
      const by = eyeMidY;

      let vx_normalized = 0;
      let vy_normalized = 0;
      if (state.lastBaseX !== null) {
        vx_normalized = (bx - state.lastBaseX) / (dt * faceWidth);
        vy_normalized = (by - state.lastBaseY) / (dt * faceWidth);
      }
      state.lastBaseX = bx;
      state.lastBaseY = by;

      const targetAngle = headAngle;
      const torqueSpring = -cfg.springK * (state.angle - targetAngle);
      const torqueDamping = -cfg.damping * state.angularVelocity;
      const perpVel = vx_normalized * Math.cos(state.angle) + vy_normalized * Math.sin(state.angle);
      const torqueInertia = -cfg.inertia * perpVel;
      const torqueGravity = -cfg.gravity * Math.sin(state.angle);

      state.angularVelocity += (torqueSpring + torqueDamping + torqueInertia + torqueGravity) * dt;
      state.angle += state.angularVelocity * dt;

      const minAngle = targetAngle - cfg.maxOffset;
      const maxAngle = targetAngle + cfg.maxOffset;
      if (state.angle > maxAngle) {
        state.angle = maxAngle;
        state.angularVelocity = 0;
      } else if (state.angle < minAngle) {
        state.angle = minAngle;
        state.angularVelocity = 0;
      }

      if (propId === 'angel') {
        state.phase += 3.0 * dt;
      }
    }

    if (propId === 'heart-glasses' || propId === 'retro-glasses') {
      const cfg = PHYSICS_CONFIG.glasses;
      const state = physicsState.glasses;
      const targetAngle = headAngle;

      const torqueSpring = -cfg.springK * (state.angle - targetAngle);
      const torqueDamping = -cfg.damping * state.angularVelocity;

      state.angularVelocity += (torqueSpring + torqueDamping) * dt;
      state.angle += state.angularVelocity * dt;
    }
  } else if (physicsState.lastTime === null) {
    physicsState.lastTime = now;
  }

  ctx.save();

  // Rendering logic for face-attached props
  if (propId === 'bunny') {
    const img = propImages.bunny;
    const earW = faceWidth * 0.55;
    const earH = faceWidth * 1.1;

    const ears = [
      { x: rightEar.x - faceWidth * 0.05, y: rightEar.y - faceWidth * 0.08, tilt: physicsState.bunny.right.angle, side: 'right' },
      { x: leftEar.x + faceWidth * 0.05, y: leftEar.y - faceWidth * 0.08, tilt: physicsState.bunny.left.angle, side: 'left' },
    ];

    ears.forEach(({ x, y, tilt, side }) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);

      if (img && img.complete && img.naturalWidth) {
        const sw = img.naturalWidth / 2;
        const sh = img.naturalHeight;
        const sx = side === 'left' ? 0 : sw;

        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = faceWidth * 0.02;
        ctx.shadowOffsetY = faceWidth * 0.015;

        ctx.drawImage(img, sx, 0, sw, sh, -earW / 2, -earH * 0.85, earW, earH);
      }
      ctx.restore();
    });
  } else if (propId === 'crown') {
    const img = propImages.crown;
    const crownBaseY = eyeMidY - faceWidth * 0.6;
    const tilt = physicsState.crown.angle;

    ctx.save();
    ctx.translate(eyeMidX, crownBaseY);
    ctx.rotate(tilt);

    if (img && img.complete && img.naturalWidth) {
      const imgW = faceWidth * 1.15;
      const imgH = imgW;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = faceWidth * 0.02;
      ctx.shadowOffsetY = faceWidth * 0.015;
      ctx.drawImage(img, -imgW / 2, -imgH * 0.8, imgW, imgH);
    }
    ctx.restore();
  } else if (propId === 'flower') {
    const img = propImages.flower;
    const flowerBaseY = eyeMidY - faceWidth * 0.45;
    const tilt = physicsState.flower.angle;

    ctx.save();
    ctx.translate(eyeMidX, flowerBaseY);
    ctx.rotate(tilt);

    if (img && img.complete && img.naturalWidth) {
      const imgW = faceWidth * 1.25;
      const imgH = imgW * 0.8;
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = faceWidth * 0.02;
      ctx.shadowOffsetY = faceWidth * 0.015;
      ctx.drawImage(img, -imgW / 2, -imgH * 0.5, imgW, imgH);
    }
    ctx.restore();
  } else if (propId === 'angel') {
    const img = propImages.angel;
    const bob = Math.sin(physicsState.angel.phase) * (faceWidth * 0.03);
    const haloBaseY = eyeMidY - faceWidth * 0.88 + bob;
    const tilt = physicsState.angel.angle;

    ctx.save();
    ctx.translate(eyeMidX, haloBaseY);
    ctx.rotate(tilt);

    if (img && img.complete && img.naturalWidth) {
      const imgW = faceWidth * 1.2;
      const imgH = imgW * 0.6;
      ctx.shadowColor = 'rgba(255, 220, 100, 0.4)';
      ctx.shadowBlur = faceWidth * 0.04;
      ctx.drawImage(img, -imgW / 2, -imgH * 0.5, imgW, imgH);
    }
    ctx.restore();
  } else if (propId === 'heart-glasses') {
    const img = propImages['heart-glasses'];
    const tilt = physicsState.glasses.angle;

    ctx.save();
    ctx.translate(eyeMidX, eyeMidY);
    ctx.rotate(tilt);

    if (img && img.complete && img.naturalWidth) {
      const imgW = Math.max(faceWidth * 0.95, eyeDistance * 2.2);
      const imgH = imgW * 0.5;
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = faceWidth * 0.02;
      ctx.shadowOffsetY = faceWidth * 0.01;
      ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
    }
    ctx.restore();
  } else if (propId === 'retro-glasses') {
    const img = propImages['retro-glasses'];
    const tilt = physicsState.glasses.angle;

    ctx.save();
    ctx.translate(eyeMidX, eyeMidY);
    ctx.rotate(tilt);

    if (img && img.complete && img.naturalWidth) {
      const imgW = Math.max(faceWidth * 0.9, eyeDistance * 2.1);
      const imgH = imgW * 0.4;
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = faceWidth * 0.02;
      ctx.shadowOffsetY = faceWidth * 0.01;
      ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
    }
    ctx.restore();
  } else if (propId === 'blush') {
    const cheekOffsetX = faceWidth * 0.28;
    const cheekY = eyeMidY + eyeToMouth * 0.55;

    [rightEye.x - cheekOffsetX * 0.2, leftEye.x + cheekOffsetX * 0.2].forEach((cx) => {
      const grad = ctx.createRadialGradient(cx, cheekY, 2, cx, cheekY, faceWidth * 0.18);
      grad.addColorStop(0, 'rgba(255,130,160,0.55)');
      grad.addColorStop(1, 'rgba(255,130,160,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cheekY, faceWidth * 0.18, 0, Math.PI * 2);
      ctx.fill();
    });

    const sparkleSize = faceWidth * 0.18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${sparkleSize}px serif`;
    ctx.fillText('✨', eyeMidX - faceWidth * 0.5, eyeMidY - faceWidth * 0.3);
    ctx.fillText('✨', eyeMidX + faceWidth * 0.5, eyeMidY - faceWidth * 0.25);
  }

  ctx.restore();
}