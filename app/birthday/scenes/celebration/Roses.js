'use client';

import { useId, useRef } from 'react';
import Rose, { ROSE_TONES, bloomRose } from '../../components/Rose';
import { gsap, useGSAP, SplitText, ScrollTrigger, prefersReducedMotion } from '../../lib/gsap';
import { birthday } from '../../birthdayConfig';
import './roses.css';

const { roses } = birthday;

// Stems share the rose head's units: the head is 128 wide, a stem 64 wide and `h` tall.
const STEM_W = 64;
const MID = STEM_W / 2;
const STEMS = [
  { h: 150, bend: 1 },
  { h: 172, bend: -1 },
  { h: 138, bend: 1 },
  { h: 164, bend: -1 },
  { h: 144, bend: -1 },
  { h: 158, bend: 1 },
];
const LEAF = 'M0 0 C 6 -6 17 -7.5 26 0 C 17 7.5 6 6 0 0 Z';
const DRAW = 1; // seconds for a stem to grow

const round = (n) => Math.round(n * 10) / 10;

function pointAt(p, t) {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((axis) => round(w.reduce((sum, k, j) => sum + k * p[j][axis], 0)));
}

function angleAt(p, t) {
  const u = 1 - t;
  const [dx, dy] = [0, 1].map(
    (axis) =>
      3 * u * u * (p[1][axis] - p[0][axis]) + 6 * u * t * (p[2][axis] - p[1][axis]) + 3 * t * t * (p[3][axis] - p[2][axis])
  );
  return round((Math.atan2(dy, dx) * 180) / Math.PI);
}

// A gently curved stem from the ground (t = 0) up into the heart of the rose (t = 1).
// Leaves and nodes are listed bottom → top, the order the growing stem reaches them.
function buildStem({ h, bend }) {
  const p = [
    [MID, h],
    [MID + bend * 11, h * 0.66],
    [MID - bend * 9, h * 0.32],
    [MID, 0],
  ];
  const at = (t) => {
    const [x, y] = pointAt(p, t);
    return { t, x, y, a: angleAt(p, t) };
  };
  const xy = ([x, y]) => `${round(x)} ${round(y)}`;
  return {
    h,
    d: `M${xy(p[0])} C${xy(p[1])} ${xy(p[2])} ${xy(p[3])}`,
    nodes: [0.2, 0.38, 0.6].map(at),
    leaves: [
      { ...at(0.38), side: bend, size: 1 },
      { ...at(0.6), side: -bend, size: 0.8 },
    ].map((leaf) => ({ ...leaf, rot: round(leaf.a + leaf.side * 58) })),
  };
}

const GEOMETRY = STEMS.map(buildStem);

// When (in seconds) the stem's power2.inOut draw reaches fraction t of its length.
const reach = (t) => DRAW * (t < 0.5 ? Math.sqrt(t / 2) : 1 - Math.sqrt((1 - t) / 2));

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function Stem({ geo, uid }) {
  const stroke = `${uid}s`;
  const leaf = `${uid}l`;
  return (
    <svg
      className="cel-rose-stem"
      viewBox={`0 0 ${STEM_W} ${geo.h}`}
      width={STEM_W}
      height={geo.h}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={stroke} gradientUnits="userSpaceOnUse" x1="0" y1={geo.h} x2="0" y2="0">
          <stop offset="0" stopColor="#2f5a2c" />
          <stop offset="0.55" stopColor="#4f8249" />
          <stop offset="1" stopColor="#86b97c" />
        </linearGradient>
        <linearGradient id={leaf} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#4a7a46" />
          <stop offset="1" stopColor="#9cc796" />
        </linearGradient>
      </defs>

      {geo.leaves.map((l) => (
        <g key={l.t} transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.size})`}>
          <g className="cel-rose-leaf">
            <path d={LEAF} fill={`url(#${leaf})`} />
            <path d="M1.5 0 L 22 0" stroke="#3f6b3b" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
          </g>
        </g>
      ))}

      <path
        className="cel-rose-stroke"
        d={geo.d}
        fill="none"
        stroke={`url(#${stroke})`}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        className="cel-rose-stroke"
        d={geo.d}
        fill="none"
        stroke="rgba(222, 248, 208, 0.38)"
        strokeWidth="1.1"
        strokeLinecap="round"
        transform="translate(-1 0)"
      />

      {geo.nodes.map((n) => (
        <g key={n.t} transform={`rotate(${round(n.a + 90)} ${n.x} ${n.y})`}>
          <ellipse className="cel-rose-node" cx={n.x} cy={n.y} rx="3.3" ry="1.8" fill="#5f9058" />
        </g>
      ))}
    </svg>
  );
}

export default function Roses() {
  const rootRef = useRef(null);
  const itemsRef = useRef([]);
  const puffsRef = useRef([]);
  const openRef = useRef([]);
  const timersRef = useRef([]);
  const liveRef = useRef(new Set());
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  useGSAP(
    () => {
      const root = rootRef.current;
      const items = itemsRef.current.filter(Boolean);
      const intro = root.querySelector('.cel-rose-intro');
      const garden = root.querySelector('.cel-rose-garden');
      const outro = root.querySelector('.cel-rose-outro');
      const live = liveRef.current;
      const timers = timersRef.current;

      const open = (i) => {
        openRef.current[i] = true;
        items[i].classList.add('is-open');
      };

      const cleanup = () => {
        live.forEach((tl) => tl.kill());
        live.clear();
        timers.forEach((t) => clearTimeout(t));
        timers.length = 0;
        puffsRef.current.forEach((layer) => layer && layer.replaceChildren());
        items.forEach((el) => el.classList.remove('is-open', 'is-lit'));
        openRef.current = [];
      };

      if (prefersReducedMotion()) {
        items.forEach((_, i) => open(i));
        [intro, ...items, outro].forEach((el) =>
          gsap.from(el, {
            autoAlpha: 0,
            duration: 0.9,
            ease: 'power1.out',
            scrollTrigger: { trigger: el, start: 'top 90%' },
          })
        );
        return cleanup;
      }

      // ---- Header -------------------------------------------------------
      gsap.from(intro.children, {
        y: 28,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: intro, start: 'top 82%' },
      });

      // ---- Idle life: a gentle sway from the stem base, and a slow breath --
      // Only runs once a rose has bloomed, and only while the garden is on screen.
      let inView = false;
      const idles = items.map((item, i) => {
        const period = gsap.utils.random(5, 7);
        const amp = gsap.utils.random(1.1, 1.8) * (i % 2 ? -1 : 1);
        const sway = gsap.to(item.querySelector('.cel-rose-sway'), {
          keyframes: [
            { rotation: amp, duration: period / 4, ease: 'sine.out' },
            { rotation: -amp, duration: period / 2, ease: 'sine.inOut' },
            { rotation: 0, duration: period / 4, ease: 'sine.in' },
          ],
          repeat: -1,
          paused: true,
        });
        const breathe = gsap.to(item.querySelector('.cel-rose-bloom'), {
          scale: 1.03,
          duration: gsap.utils.random(2.4, 3.2),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          paused: true,
        });
        return { on: false, tweens: [sway, breathe] };
      });

      const syncIdle = () =>
        idles.forEach(({ on, tweens }) => tweens.forEach((t) => (on && inView ? t.play() : t.pause())));

      const watch = ScrollTrigger.create({
        trigger: garden,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          inView = self.isActive;
          syncIdle();
        },
      });

      const wake = (i) => {
        open(i);
        idles[i].on = true;
        inView = inView || watch.isActive;
        syncIdle();
      };

      // ---- Growth: stem draws up, leaves unfold, rose blooms, words arrive --
      const blooms = items.map((item, i) => {
        const geo = GEOMETRY[i % GEOMETRY.length];
        const q = (sel) => item.querySelectorAll(sel);
        const tl = gsap.timeline({ paused: true });

        tl.from(q('.cel-rose-soil'), { autoAlpha: 0, scaleX: 0.3, duration: 0.7, ease: 'power2.out' }, 0)
          .from(q('.cel-rose-stem'), { autoAlpha: 0, duration: 0.2, ease: 'none' }, 0)
          .fromTo(
            q('.cel-rose-stroke'),
            { drawSVG: '0% 0%' },
            { drawSVG: '0% 100%', duration: DRAW, ease: 'power2.inOut' },
            0
          );

        q('.cel-rose-node').forEach((node, k) => {
          tl.from(
            node,
            { scale: 0, transformOrigin: '50% 50%', duration: 0.35, ease: 'back.out(3)' },
            reach(geo.nodes[k].t)
          );
        });
        q('.cel-rose-leaf').forEach((leaf, k) => {
          tl.from(
            leaf,
            { scale: 0, transformOrigin: '0% 50%', duration: 0.75, ease: 'back.out(1.7)' },
            reach(geo.leaves[k].t) + 0.05
          );
        });

        tl.add(bloomRose(item.querySelector('.cel-rose-flower'), { duration: 1.25 }), DRAW * 0.8)
          .call(wake, [i], '<1.1')
          .from(
            q('.cel-rose-name, .cel-rose-meaning'),
            { autoAlpha: 0, y: 14, duration: 0.8, ease: 'power2.out', stagger: 0.12 },
            DRAW * 0.8 + 0.7
          );
        return tl;
      });

      // Roses that come into view together bloom ~0.25s apart.
      ScrollTrigger.batch(items, {
        start: 'center 85%',
        once: true,
        onEnter: (batch) =>
          batch.forEach((el, k) => {
            const tl = blooms[items.indexOf(el)];
            if (tl) tl.delay(k * 0.25).restart(true);
          }),
      });

      // ---- Closing line --------------------------------------------------
      const closing = root.querySelector('.cel-rose-closing');
      const split = SplitText.create(closing, { type: 'words', mask: 'words', wordsClass: 'cel-rose-word' });
      gsap
        .timeline({ scrollTrigger: { trigger: outro, start: 'top 86%' } })
        .from(root.querySelectorAll('.cel-rose-rule'), { scaleX: 0, duration: 1, ease: 'power3.out' }, 0)
        .add(bloomRose(root.querySelector('.cel-rose-mini'), { duration: 1 }), 0.1)
        .from(
          split.words,
          {
            yPercent: 115,
            duration: 1,
            ease: 'power4.out',
            stagger: 0.08,
            // Unwrap afterwards so the line's glow isn't cropped by the word masks.
            onComplete: () => split.revert(),
          },
          0.35
        );

      return cleanup;
    },
    { scope: rootRef }
  );

  // A few petals puff out of the rose, drift down and fade. Not tied to the
  // GSAP context (it would keep every puff alive); tracked and killed on unmount.
  const puff = (i) => {
    if (!openRef.current[i] || prefersReducedMotion()) return;
    const layer = puffsRef.current[i];
    if (!layer || layer.childElementCount > 18) return;
    const size = layer.parentElement.offsetWidth || 100;
    const { random } = gsap.utils;
    const count = 6 + Math.round(Math.random());

    for (let k = 0; k < count; k++) {
      const el = document.createElement('i');
      el.className = 'cel-rose-petal';
      layer.appendChild(el);

      const angle = ((k + random(0, 0.7)) / count) * Math.PI * 2;
      const dist = size * random(0.42, 0.7);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist * 0.75 - size * 0.12;
      const drift = random(0.9, 1.4);
      const life = 0.55 + drift;

      gsap.set(el, {
        x: 0,
        y: 0,
        scale: random(0.6, 1.05),
        rotation: random(0, 360),
        transformPerspective: 300,
        autoAlpha: 0,
      });
      const tl = gsap
        .timeline({
          onComplete: () => {
            el.remove();
            liveRef.current.delete(tl);
          },
        })
        .to(el, { autoAlpha: 1, duration: 0.12, ease: 'none' }, 0)
        .to(el, { x: dx, y: dy, duration: 0.6, ease: 'power3.out' }, 0)
        .to(el, { x: dx + random(-20, 20), y: dy + size * random(0.35, 0.7), duration: drift, ease: 'sine.inOut' }, 0.55)
        .to(el, { rotation: `+=${random(-260, 260)}`, rotationY: random(180, 540), duration: life, ease: 'power1.out' }, 0)
        .to(el, { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, life - 0.5);
      liveRef.current.add(tl);
    }
  };

  // Tap / keyboard: hold the lift + glow for a moment (mouse hover is pure CSS).
  const light = (i) => {
    const item = itemsRef.current[i];
    if (!item || !openRef.current[i]) return;
    item.classList.add('is-lit');
    clearTimeout(timersRef.current[i]);
    timersRef.current[i] = setTimeout(() => item.classList.remove('is-lit'), 1400);
  };

  return (
    <section ref={rootRef} className="cel-section cel-rose" aria-labelledby="cel-rose-title">
      <header className="cel-rose-intro">
        <p className="cel-kicker">{roses.kicker}</p>
        <h2 id="cel-rose-title" className="cel-h2">
          {roses.title}
        </h2>
        <p className="cel-rose-sub">{roses.subtitle}</p>
      </header>

      <ul className="cel-rose-garden">
        {roses.list.map((rose, i) => {
          const tone = ROSE_TONES[rose.tone] ? rose.tone : 'pink';
          const t = ROSE_TONES[tone];
          return (
            <li
              key={`${rose.tone}-${i}`}
              ref={(el) => {
                itemsRef.current[i] = el;
              }}
              className="cel-rose-item"
              style={{
                '--cel-rose-light': t.light,
                '--cel-rose-base': t.base,
                '--cel-rose-dark': t.dark,
                '--cel-rose-glow': rgba(t.base, 0.55),
              }}
            >
              <button
                type="button"
                className="cel-rose-plant"
                aria-label={`${rose.name} rose`}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') puff(i);
                }}
                onClick={() => {
                  light(i);
                  puff(i);
                }}
              >
                <span className="cel-rose-soil" aria-hidden="true" />
                <span className="cel-rose-lift">
                  <span className="cel-rose-sway">
                    <span className="cel-rose-bloom">
                      <span className="cel-rose-halo" aria-hidden="true" />
                      <Rose tone={tone} size={128} leaves className="cel-rose-flower" />
                      <span
                        className="cel-rose-puff"
                        aria-hidden="true"
                        ref={(el) => {
                          puffsRef.current[i] = el;
                        }}
                      />
                    </span>
                    <Stem geo={GEOMETRY[i % GEOMETRY.length]} uid={`${uid}${i}`} />
                  </span>
                </span>
              </button>
              <h3 className="cel-rose-name">{rose.name}</h3>
              <p className="cel-rose-meaning">{rose.meaning}</p>
            </li>
          );
        })}
      </ul>

      <div className="cel-rose-outro">
        <div className="cel-rose-flourish" aria-hidden="true">
          <span className="cel-rose-rule" />
          <Rose tone="pink" size={30} leaves={false} className="cel-rose-mini" />
          <span className="cel-rose-rule" />
        </div>
        <p className="cel-rose-closing">{roses.closing}</p>
      </div>
    </section>
  );
}
