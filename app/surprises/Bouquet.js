'use client';

import { useId } from 'react';

const FLOWER_GLYPHS = {
  rose: '🌹',
  roseAlt: '🥀',
  heart: '❤',
  lily: '🤍',
  blossom: '🌸',
  blossom2: '✿',
  lily2: '🪷',
  tulip: '🌷',
  hibiscus: '🌺',
  daisy: '🌼',
  sunflower: '🌻',
  herb: '🌿',
  stem: '|',
  stemSlash: '/',
  stemBack: '\\',
};

const RED_GLYPHS = new Set(['rose', 'roseAlt', 'heart']);
const WHITE_GLYPHS = new Set(['lily', 'blossom', 'blossom2', 'lily2']);

const FLOWER_DATA = [
  { key: 'rose',     x: 178, y:  18, size: 2.3, rot:  -6, layer: 1 },
  { key: 'lily',     x:  92, y:  26, size: 1.8, rot:   8, layer: 1 },
  { key: 'blossom',  x: 250, y:  44, size: 1.7, rot:  -4, layer: 1 },
  { key: 'roseAlt',  x:  52, y:  56, size: 1.9, rot:  10, layer: 2 },
  { key: 'blossom2', x: 138, y:  60, size: 1.5, rot:   2, layer: 2 },
  { key: 'rose',     x: 220, y:  78, size: 2.1, rot:  -8, layer: 2 },
  { key: 'heart',    x: 295, y:  84, size: 1.3, rot:  -2, layer: 2 },
  { key: 'lily',     x:  20, y:  98, size: 1.7, rot:  14, layer: 3 },
  { key: 'rose',     x:  92, y:  98, size: 2.2, rot:  -6, layer: 3 },
  { key: 'blossom',  x: 168, y: 104, size: 1.6, rot:   4, layer: 3 },
  { key: 'roseAlt',  x: 240, y: 108, size: 1.8, rot: -10, layer: 3 },
  { key: 'lily2',    x: 305, y: 112, size: 1.7, rot:   6, layer: 3 },
  { key: 'blossom2', x: 132, y: 134, size: 1.4, rot:  -3, layer: 4 },
  { key: 'rose',     x:  58, y: 142, size: 2.1, rot:  10, layer: 4 },
  { key: 'lily',     x: 200, y: 144, size: 1.6, rot:  -4, layer: 4 },
  { key: 'blossom',  x: 280, y: 148, size: 1.5, rot:   8, layer: 4 },
  { key: 'heart',    x: 108, y: 168, size: 1.2, rot:  -2, layer: 5 },
  { key: 'rose',     x: 232, y: 176, size: 2.0, rot:  -8, layer: 5 },
  { key: 'blossom2', x: 168, y: 188, size: 1.3, rot:   3, layer: 5 },
  { key: 'lily',     x:  78, y: 188, size: 1.6, rot:  12, layer: 5 },
  { key: 'roseAlt',  x: 248, y: 196, size: 1.7, rot:  -6, layer: 5 },
  { key: 'blossom',  x: 308, y: 188, size: 1.4, rot:   4, layer: 5 },
  { key: 'rose',     x: 142, y: 214, size: 1.9, rot:  -4, layer: 6 },
  { key: 'lily2',    x:  40, y: 220, size: 1.5, rot:  10, layer: 6 },
  { key: 'blossom',  x: 200, y: 216, size: 1.4, rot:  -8, layer: 6 },
  { key: 'rose',     x: 268, y: 222, size: 1.9, rot:   6, layer: 6 },
  { key: 'lily',     x: 178, y: 244, size: 1.5, rot:   2, layer: 6 },
  { key: 'blossom2', x: 110, y: 248, size: 1.3, rot: -10, layer: 7 },
  { key: 'roseAlt',  x: 210, y: 256, size: 1.6, rot:   6, layer: 7 },
  { key: 'heart',    x: 268, y: 254, size: 1.1, rot:   0, layer: 7 },
];

const STEM_DATA = [
  { x: 178, y: 232, length: 212, tilt:   0, width: 3 },
  { x:  92, y: 244, length: 198, tilt:  16, width: 3 },
  { x: 250, y: 240, length: 168, tilt: -18, width: 3 },
  { x:  52, y: 250, length: 174, tilt:  22, width: 3 },
  { x: 138, y: 256, length: 170, tilt:  -6, width: 3 },
  { x: 220, y: 250, length: 162, tilt: -10, width: 3 },
  { x: 295, y: 268, length: 154, tilt: -22, width: 3 },
];

const LEAF_DATA = [
  { x: 152, y: 360, rot: -38, size: 1.5 },
  { x: 200, y: 372, rot:  22, size: 1.4 },
  { x: 110, y: 384, rot:  46, size: 1.5 },
  { x: 240, y: 388, rot: -28, size: 1.4 },
  { x:  78, y: 408, rot:  58, size: 1.3 },
  { x: 268, y: 408, rot: -52, size: 1.3 },
];

const SPARKLE_DATA = [
  { x:  12, y:  22, delay: 0.0, size: 1.0 },
  { x: 332, y:  48, delay: 1.2, size: 0.9 },
  { x:  20, y: 168, delay: 0.6, size: 1.1 },
  { x: 348, y: 188, delay: 1.8, size: 0.8 },
  { x:  46, y: 308, delay: 2.4, size: 1.0 },
  { x: 318, y: 332, delay: 0.8, size: 0.9 },
  { x: 156, y:  52, delay: 1.6, size: 1.0 },
  { x: 232, y: 308, delay: 2.0, size: 0.9 },
];

function flowerStyle(flower) {
  const glyph = FLOWER_GLYPHS[flower.key] ?? FLOWER_GLYPHS.blossom;
  const isRed = RED_GLYPHS.has(flower.key);
  return {
    position: 'absolute',
    left: `${flower.x}px`,
    top: `${flower.y}px`,
    fontSize: `${flower.size}rem`,
    lineHeight: 1,
    transform: `translate(-50%, -50%) rotate(${flower.rot}deg)`,
    transformOrigin: 'center center',
    zIndex: flower.layer ?? 1,
    color: isRed ? '#9b0b30' : '#ffffff',
    textShadow: isRed
      ? '0 0 6px rgba(255, 80, 120, 0.55), 0 0 12px rgba(190, 20, 50, 0.35)'
      : '0 0 5px rgba(255, 255, 255, 0.85), 0 0 10px rgba(255, 200, 220, 0.55)',
    WebkitTextStroke: isRed ? '0.4px #5b0620' : '0.3px #b48aa8',
    userSelect: 'none',
    pointerEvents: 'none',
    fontFamily:
      '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", monospace',
  };
}

function stemStyle(stem) {
  return {
    position: 'absolute',
    left: `${stem.x}px`,
    top: `${stem.y}px`,
    width: `${stem.width}px`,
    height: `${stem.length}px`,
    background:
      'linear-gradient(180deg, #4d7a3a 0%, #2f5a23 55%, #234a1a 100%)',
    transform: `translateX(-50%) rotate(${stem.tilt}deg)`,
    transformOrigin: 'top center',
    borderRadius: `${stem.width / 2}px`,
    boxShadow:
      '0 0 0 1px rgba(20, 50, 20, 0.25), inset 0 0 4px rgba(20, 50, 20, 0.45)',
    zIndex: 0,
    pointerEvents: 'none',
  };
}

function leafStyle(leaf) {
  return {
    position: 'absolute',
    left: `${leaf.x}px`,
    top: `${leaf.y}px`,
    fontSize: `${leaf.size}rem`,
    lineHeight: 1,
    transform: `translate(-50%, -50%) rotate(${leaf.rot}deg)`,
    color: '#3a6b2a',
    textShadow:
      '0 0 4px rgba(40, 90, 30, 0.45), 0 0 9px rgba(60, 120, 40, 0.25)',
    zIndex: 2,
    pointerEvents: 'none',
    userSelect: 'none',
    fontFamily:
      '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", monospace',
  };
}

function sparkleStyle(sparkle) {
  return {
    position: 'absolute',
    left: `${sparkle.x}px`,
    top: `${sparkle.y}px`,
    fontSize: `${sparkle.size}rem`,
    lineHeight: 1,
    transform: 'translate(-50%, -50%)',
    color: '#fff7d6',
    textShadow:
      '0 0 6px rgba(255, 220, 150, 0.9), 0 0 12px rgba(255, 180, 200, 0.6)',
    animation: `bouquetSparkle 3.6s ease-in-out infinite`,
    animationDelay: `${sparkle.delay}s`,
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 9,
    fontFamily:
      '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", monospace',
  };
}

const BOUQUET_STYLES = `
.bouquet-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem 0.5rem 0.25rem;
  width: 100%;
}

.bouquet {
  position: relative;
  width: 360px;
  height: 480px;
  max-width: 100%;
  margin: 0 auto;
  animation: bouquetSway 4s ease-in-out infinite;
  transform-origin: 50% 95%;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  filter: drop-shadow(0 18px 22px rgba(120, 30, 50, 0.18));
}

@keyframes bouquetSway {
  0%, 100% { transform: rotate(-2deg) translateY(0); }
  50%      { transform: rotate(2deg)  translateY(-4px); }
}

.bouquet-paper {
  position: absolute;
  left: 50%;
  bottom: 18px;
  width: 280px;
  height: 380px;
  transform: translateX(-50%);
  clip-path: polygon(50% 0%, 96% 22%, 100% 100%, 0% 100%, 4% 22%);
  background:
    linear-gradient(180deg, #f7e3c8 0%, #ecd2a8 55%, #d9b682 100%);
  box-shadow:
    inset 0 0 0 1px rgba(120, 80, 40, 0.18),
    inset -14px 0 24px rgba(160, 110, 60, 0.25),
    inset 14px 0 24px rgba(255, 220, 180, 0.35);
  z-index: 1;
}

.bouquet-paper::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      78deg,
      rgba(120, 80, 40, 0.07) 0px,
      rgba(120, 80, 40, 0.07) 1px,
      transparent 1px,
      transparent 7px
    ),
    repeating-linear-gradient(
      -55deg,
      rgba(255, 240, 210, 0.18) 0px,
      rgba(255, 240, 210, 0.18) 1px,
      transparent 1px,
      transparent 9px
    ),
    radial-gradient(
      ellipse at 30% 30%,
      rgba(255, 245, 220, 0.55),
      transparent 55%
    );
  mix-blend-mode: multiply;
  pointer-events: none;
}

.bouquet-paper::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 230px;
  height: 90%;
  transform: translateX(-50%);
  background:
    radial-gradient(
      ellipse at 50% 100%,
      rgba(120, 70, 30, 0.22),
      transparent 60%
    );
  border-bottom-left-radius: 80% 100%;
  border-bottom-right-radius: 80% 100%;
  pointer-events: none;
}

.bouquet-fold {
  position: absolute;
  left: 50%;
  top: 6px;
  width: 70px;
  height: 110px;
  transform: translateX(-50%);
  background:
    linear-gradient(180deg, #fff3d8 0%, #f0d8a8 100%);
  clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  filter: drop-shadow(0 2px 4px rgba(120, 80, 40, 0.18));
  z-index: 2;
}

.bouquet-fold-left,
.bouquet-fold-right {
  position: absolute;
  top: 28px;
  width: 40px;
  height: 140px;
  z-index: 2;
}
.bouquet-fold-left {
  left: 64px;
  transform: rotate(-14deg);
  background: linear-gradient(180deg, #f6dcbe, #e1c08d);
  clip-path: polygon(60% 0%, 100% 50%, 80% 100%, 30% 90%, 20% 30%);
}
.bouquet-fold-right {
  right: 64px;
  transform: rotate(14deg);
  background: linear-gradient(180deg, #f6dcbe, #e1c08d);
  clip-path: polygon(40% 0%, 0% 50%, 20% 100%, 70% 90%, 80% 30%);
}

.bouquet-top-circle {
  position: absolute;
  left: 50%;
  top: 4px;
  width: 54px;
  height: 54px;
  transform: translateX(-50%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, #fff7e0 0%, #f0d3a4 60%, #caa366 100%);
  box-shadow:
    0 0 0 2px rgba(150, 100, 50, 0.35),
    inset 0 -6px 12px rgba(140, 90, 40, 0.35),
    inset 0 6px 12px rgba(255, 245, 220, 0.6);
  z-index: 4;
}

.bouquet-ribbon {
  position: absolute;
  left: 50%;
  bottom: 150px;
  width: 220px;
  height: 44px;
  transform: translateX(-50%);
  background:
    linear-gradient(180deg, #d12138 0%, #a30e26 45%, #6b0418 100%);
  border-radius: 22px;
  box-shadow:
    inset 0 -4px 8px rgba(0, 0, 0, 0.35),
    inset 0 4px 8px rgba(255, 200, 210, 0.45),
    0 4px 14px rgba(120, 10, 30, 0.45);
  z-index: 5;
}

.bouquet-ribbon::before,
.bouquet-ribbon::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, #ff5e74 0%, #c81e36 45%, #7a0a1d 100%);
  box-shadow:
    inset 0 -4px 8px rgba(0, 0, 0, 0.35),
    inset 4px 4px 8px rgba(255, 220, 230, 0.45),
    0 6px 12px rgba(120, 10, 30, 0.4);
  transform: translateY(-50%);
  z-index: 6;
}

.bouquet-ribbon::before {
  left: -34px;
  clip-path: polygon(0% 50%, 100% 0%, 90% 100%);
  border-radius: 40% 60% 60% 40% / 50% 50% 50% 50%;
}

.bouquet-ribbon::after {
  right: -34px;
  clip-path: polygon(100% 50%, 0% 0%, 10% 100%);
  border-radius: 60% 40% 40% 60% / 50% 50% 50% 50%;
}

.bouquet-knot {
  position: absolute;
  left: 50%;
  top: -8px;
  width: 22px;
  height: 26px;
  transform: translateX(-50%);
  border-radius: 6px 6px 8px 8px;
  background:
    linear-gradient(180deg, #ff4a64 0%, #b8152e 60%, #68041a 100%);
  box-shadow:
    inset 0 -3px 6px rgba(0, 0, 0, 0.4),
    inset 0 3px 6px rgba(255, 220, 230, 0.5),
    0 3px 6px rgba(120, 10, 30, 0.4);
  z-index: 7;
}

.bouquet-knot::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  width: 14px;
  height: 10px;
  border-radius: 0 0 8px 8px;
  background: linear-gradient(180deg, #a30e26, #5c0414);
  box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.4);
}

.bouquet-tail {
  position: absolute;
  left: 50%;
  bottom: 36px;
  width: 18px;
  height: 110px;
  transform: translateX(-50%) rotate(2deg);
  background:
    repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.18) 0 4px,
      rgba(255, 255, 255, 0.0) 4px 8px
    ),
    linear-gradient(180deg, #d12138 0%, #a30e26 60%, #6b0418 100%);
  border-radius: 6px;
  box-shadow:
    inset 0 -4px 8px rgba(0, 0, 0, 0.35),
    inset 0 4px 8px rgba(255, 200, 210, 0.35);
  z-index: 3;
  clip-path: polygon(50% 0%, 100% 20%, 80% 100%, 20% 100%, 0% 20%);
}

.bouquet-tail::before,
.bouquet-tail::after {
  content: '';
  position: absolute;
  top: 100%;
  width: 12px;
  height: 60px;
  background:
    linear-gradient(180deg, #c11a30 0%, #6b0418 100%);
  border-radius: 0 0 10px 10px;
  box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.35);
}

.bouquet-tail::before {
  left: -2px;
  transform: rotate(14deg);
  clip-path: polygon(0% 0%, 100% 12%, 80% 100%, 30% 100%);
}

.bouquet-tail::after {
  right: -2px;
  transform: rotate(-14deg);
  clip-path: polygon(0% 12%, 100% 0%, 70% 100%, 20% 100%);
}

@keyframes bouquetSparkle {
  0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
  50%      { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
}

@media (max-width: 480px) {
  .bouquet {
    transform: scale(0.75);
    transform-origin: 50% 95%;
  }
}

@media (max-width: 360px) {
  .bouquet {
    transform: scale(0.62);
    transform-origin: 50% 95%;
  }
}
`;

export default function Bouquet() {
  const reactId = useId();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BOUQUET_STYLES }} />
      <div
        className="bouquet-wrap"
        role="img"
        aria-label="Pixel art bouquet of red roses and white lilies wrapped in paper with a ribbon"
      >
        <div className="bouquet" data-reactid={reactId}>
          <div className="bouquet-fold" />
          <div className="bouquet-fold-left" />
          <div className="bouquet-fold-right" />
          <div className="bouquet-paper" />
          <div className="bouquet-tail" />
          <div className="bouquet-ribbon">
            <span className="bouquet-knot" />
          </div>
          <div className="bouquet-top-circle" />

          {STEM_DATA.map((stem, i) => (
            <div key={`stem-${i}`} style={stemStyle(stem)} />
          ))}

          {FLOWER_DATA.map((flower, i) => (
            <span
              key={`flower-${i}`}
              style={flowerStyle(flower)}
              aria-hidden="true"
            >
              {FLOWER_GLYPHS[flower.key] ?? FLOWER_GLYPHS.blossom}
            </span>
          ))}

          {LEAF_DATA.map((leaf, i) => (
            <span
              key={`leaf-${i}`}
              style={leafStyle(leaf)}
              aria-hidden="true"
            >
              {FLOWER_GLYPHS.herb}
            </span>
          ))}

          {SPARKLE_DATA.map((sparkle, i) => (
            <span
              key={`sparkle-${i}`}
              style={sparkleStyle(sparkle)}
              aria-hidden="true"
            >
              ✨
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
