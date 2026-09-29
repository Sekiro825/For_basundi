'use client';

import { useId } from 'react';
import { gsap } from '../lib/gsap';

// Every colour of rose she loves. Deliberately no red.
export const ROSE_TONES = {
  pink: { light: '#ffe3ee', base: '#f7a6c4', dark: '#d8739c', core: '#c45a86' },
  peach: { light: '#ffece0', base: '#ffc6a6', dark: '#ec9b76', core: '#d47c58' },
  yellow: { light: '#fff7cf', base: '#ffd86a', dark: '#e2b02e', core: '#c8931a' },
  white: { light: '#ffffff', base: '#fbf2ea', dark: '#e1cfc1', core: '#c9b2a0' },
  lavender: { light: '#f3ebfc', base: '#caaeeb', dark: '#9e80d1', core: '#8466bb' },
  orange: { light: '#ffe4c6', base: '#ffaf6e', dark: '#ec8642', core: '#d46b28' },
};

export const ROSE_ORDER = ['pink', 'peach', 'yellow', 'white', 'lavender', 'orange'];

// Rings of petals, drawn outer → inner so the heart of the rose sits on top.
const RINGS = [
  { n: 5, r: 50, w: 0.78, turn: 0 },
  { n: 5, r: 40, w: 0.74, turn: 36 },
  { n: 5, r: 30, w: 0.7, turn: 14 },
  { n: 4, r: 20, w: 0.72, turn: 52 },
  { n: 3, r: 12, w: 0.8, turn: 20 },
];

function petal(r, w) {
  return `M0 0 C ${-w * r} ${-0.12 * r} ${-w * 1.08 * r} ${-0.84 * r} ${-0.22 * r} ${-0.99 * r} Q 0 ${-1.05 * r} ${0.22 * r} ${-0.99 * r} C ${w * 1.08 * r} ${-0.84 * r} ${w * r} ${-0.12 * r} 0 0 Z`;
}

const LEAF = 'M0 0 C 9 -7 26 -9 40 0 C 26 9 9 7 0 0 Z';

export default function Rose({ tone = 'pink', size, leaves = true, className = '', style, ...rest }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = ROSE_TONES[tone] || ROSE_TONES.pink;

  return (
    <svg
      className={`rose ${className}`}
      viewBox="-64 -64 128 128"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <defs>
        <radialGradient id={`${uid}p`} cx="50%" cy="100%" r="105%">
          <stop offset="0" stopColor={t.dark} />
          <stop offset="0.45" stopColor={t.base} />
          <stop offset="1" stopColor={t.light} />
        </radialGradient>
        <radialGradient id={`${uid}c`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor={t.base} />
          <stop offset="1" stopColor={t.core} />
        </radialGradient>
        <linearGradient id={`${uid}l`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5d8a5a" />
          <stop offset="1" stopColor="#9cc796" />
        </linearGradient>
      </defs>

      {leaves && (
        <g className="rose-leaves">
          {[150, 30, 95].map((a) => (
            <g key={a} className="rose-leaf" transform={`rotate(${a}) translate(20 0)`}>
              <path d={LEAF} fill={`url(#${uid}l)`} />
              <path d="M2 0 L 36 0" stroke="#4d7a4a" strokeWidth="0.9" opacity="0.55" />
            </g>
          ))}
        </g>
      )}

      {RINGS.map((ring, ri) => (
        <g key={ri} className="rose-ring">
          {Array.from({ length: ring.n }, (_, i) => (
            <path
              key={i}
              d={petal(ring.r, ring.w)}
              transform={`rotate(${ring.turn + (i * 360) / ring.n})`}
              fill={`url(#${uid}p)`}
              stroke={t.dark}
              strokeOpacity="0.4"
              strokeWidth="0.7"
            />
          ))}
        </g>
      ))}

      <g className="rose-core">
        <circle r="7.5" fill={`url(#${uid}c)`} />
        <path
          d="M0 -1.5 C 3 -3 5 1 1.5 3.5 C -2.5 6 -6 1 -3.5 -3 C -1 -6.5 5 -6 6.5 -1"
          fill="none"
          stroke={t.core}
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>
    </svg>
  );
}

// Unfurls a rendered <Rose>: leaves, then petal rings from the heart outward.
export function bloomRose(svg, { delay = 0, duration = 1.3 } = {}) {
  const tl = gsap.timeline({ delay });
  if (!svg) return tl;
  const rings = Array.from(svg.querySelectorAll('.rose-ring')).reverse();
  const leaves = svg.querySelectorAll('.rose-leaf');
  const core = svg.querySelector('.rose-core');
  if (leaves.length) {
    tl.from(leaves, { scale: 0, opacity: 0, transformOrigin: '0% 50%', duration: 0.8, ease: 'back.out(1.7)', stagger: 0.08 }, 0);
  }
  tl.from(core, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2)' }, 0.05).from(
    rings,
    { scale: 0.15, rotation: -50, opacity: 0, transformOrigin: '50% 50%', duration, ease: 'expo.out', stagger: 0.11 },
    0.1
  );
  return tl;
}
