'use client';

import Rose from './Rose';

// A hand-tied bouquet of every rose she loves (none of them red).
const ROSES = [
  { x: 100, y: 84, s: 98, tone: 'lavender' },
  { x: 200, y: 84, s: 98, tone: 'white' },
  { x: 150, y: 52, s: 94, tone: 'peach' },
  { x: 62, y: 142, s: 94, tone: 'yellow' },
  { x: 238, y: 142, s: 94, tone: 'orange' },
  { x: 150, y: 130, s: 126, tone: 'pink' },
];

const LEAVES = [
  [96, 162, 200, 1],
  [204, 162, -20, 1],
  [112, 128, 232, 0.95],
  [188, 128, -52, 0.95],
  [150, 96, 270, 0.85],
  [74, 186, 168, 0.8],
  [226, 186, 12, 0.8],
];

const BREATH = [
  [48, 96], [56, 88], [42, 106], [252, 96], [244, 88], [258, 106],
  [124, 26], [132, 20], [176, 26], [168, 20], [30, 150], [270, 150],
];

export default function Bouquet({ className = '' }) {
  return (
    <svg className={`bq ${className}`} viewBox="0 0 300 360" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bq-paper" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#f3c3d6" />
          <stop offset="0.5" stopColor="#ffe8f0" />
          <stop offset="1" stopColor="#efb8cd" />
        </linearGradient>
        <linearGradient id="bq-paper-front" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff5f8" />
          <stop offset="1" stopColor="#f5c4d7" />
        </linearGradient>
        <linearGradient id="bq-leaf" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#557f52" />
          <stop offset="1" stopColor="#9ec897" />
        </linearGradient>
        <linearGradient id="bq-ribbon" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e6d6f8" />
          <stop offset="1" stopColor="#9e80d1" />
        </linearGradient>
      </defs>

      <path className="bq-paper-back" d="M36 150 L264 150 L170 344 L130 344 Z" fill="url(#bq-paper)" />

      <g className="bq-leaves">
        {LEAVES.map(([x, y, rot, s], i) => (
          <g key={i} className="bq-leaf" transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
            <path d="M0 0 C 12 -10 36 -12 58 0 C 36 12 12 10 0 0 Z" fill="url(#bq-leaf)" />
            <path d="M3 0 L 52 0" stroke="#456f43" strokeWidth="0.9" opacity="0.5" />
          </g>
        ))}
      </g>

      <g className="bq-roses">
        {ROSES.map((r, i) => (
          <g key={i} className="bq-rose">
            <Rose tone={r.tone} leaves={false} x={r.x - r.s / 2} y={r.y - r.s / 2} width={r.s} height={r.s} />
          </g>
        ))}
      </g>

      <g className="bq-breath">
        {BREATH.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 2.3} fill="#fffaf2" opacity="0.92" />
        ))}
      </g>

      <path
        className="bq-paper-front"
        d="M50 170 Q150 208 250 170 L172 340 L128 340 Z"
        fill="url(#bq-paper-front)"
        stroke="#e7a9c1"
        strokeWidth="1"
      />
      <path d="M150 200 L150 338 M112 190 L140 336 M188 190 L160 336" stroke="#e7a9c1" strokeWidth="0.8" opacity="0.55" fill="none" />

      <g className="bq-ribbon" transform="translate(150 262)">
        <path d="M-4 2 C -14 22 -20 40 -28 60 L -17 58 C -10 38 -4 22 2 4 Z" fill="#b89ae0" />
        <path d="M4 2 C 14 22 20 40 28 60 L 17 58 C 10 38 4 22 -2 4 Z" fill="#b89ae0" />
        <path d="M0 0 C -30 -28 -56 -6 -42 9 C -31 19 -12 8 0 0 Z" fill="url(#bq-ribbon)" />
        <path d="M0 0 C 30 -28 56 -6 42 9 C 31 19 12 8 0 0 Z" fill="url(#bq-ribbon)" />
        <circle r="7.5" fill="#dcc7f3" />
      </g>
    </svg>
  );
}
