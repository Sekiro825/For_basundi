'use client';

import confetti from 'canvas-confetti';

// Rose colours she loves (pink, peach, yellow, white, lavender, orange) plus gold. Never red.
export const PALETTE = ['#f7a6c4', '#ffc6a6', '#ffd86a', '#fff4e6', '#caaeeb', '#ffaf6e', '#e8c26e'];

const HEART_PATH =
  'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z';

// A soft rose petal
const PETAL_PATH = 'M0 0 C 10 -4 18 -18 12 -32 C 8 -40 -8 -40 -12 -32 C -18 -18 -10 -4 0 0 Z';

const shapes = {};
function shape(key, path) {
  if (!shapes[key]) {
    try {
      shapes[key] = confetti.shapeFromPath({ path });
    } catch {
      shapes[key] = 'circle';
    }
  }
  return shapes[key];
}
const heart = () => shape('heart', HEART_PATH);
const petal = () => shape('petal', PETAL_PATH);

const base = { colors: PALETTE, zIndex: 80, disableForReducedMotion: true };
const mixed = () => [petal(), petal(), 'square', 'circle'];

// Two cannons from the bottom corners.
export function sideCannons() {
  confetti({ ...base, shapes: mixed(), particleCount: 90, angle: 60, spread: 65, startVelocity: 62, origin: { x: 0, y: 0.85 } });
  confetti({ ...base, shapes: mixed(), particleCount: 90, angle: 120, spread: 65, startVelocity: 62, origin: { x: 1, y: 0.85 } });
}

// A soft burst of hearts from a point (x/y are 0–1 viewport fractions).
export function heartBurst(x = 0.5, y = 0.4, count = 45) {
  confetti({ ...base, particleCount: count, spread: 360, startVelocity: 28, gravity: 0.7, scalar: 1.7, ticks: 220, shapes: [heart(), petal()], origin: { x, y } });
}

// A short celebratory flurry: cannons, then hearts, then a gentle rain.
export function grandCelebration() {
  sideCannons();
  setTimeout(() => heartBurst(0.5, 0.35, 60), 380);
  setTimeout(() => {
    // A gentle shower of rose petals
    confetti({ ...base, shapes: [petal()], scalar: 1.5, particleCount: 120, spread: 160, startVelocity: 22, gravity: 0.5, drift: 0.4, ticks: 360, origin: { x: 0.5, y: -0.1 }, angle: 270 });
  }, 900);
}

export default confetti;
