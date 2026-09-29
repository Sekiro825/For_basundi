'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '../lib/gsap';
import { buildSong, SONG_LINES } from '../lib/musicBox';
import { createBlowDetector } from '../lib/blowDetector';
import { grandCelebration } from '../lib/confetti';
import { birthday } from '../birthdayConfig';
import Rose, { ROSE_ORDER } from '../components/Rose';
import './cake.css';

/* ---------- Cake geometry (SVG user units, viewBox 0 30 400 360) ---------- */

const CX = 200;
const BOTTOM = { cy: 262, rx: 150, ry: 26, h: 84 };
const TOP = { cy: 186, rx: 96, ry: 17, h: 78 };

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const edgeY = (tier, x, bottom = false) => {
  const t = (x - CX) / tier.rx;
  return (bottom ? tier.cy + tier.h : tier.cy) + tier.ry * Math.sqrt(Math.max(0, 1 - t * t));
};

// Body of a cylindrical tier: straight sides, curved bottom.
function tierBody({ cy, rx, ry, h }) {
  return `M ${CX - rx} ${cy} L ${CX - rx} ${cy + h} A ${rx} ${ry} 0 0 0 ${CX + rx} ${cy + h} L ${CX + rx} ${cy} Z`;
}

// Frosting skirt: follows the front edge of the top face and hangs in drips.
function dripSkirt(tier, drips, base) {
  const left = CX - tier.rx;
  const width = tier.rx * 2;
  const steps = 170;
  const lower = [];
  for (let i = 0; i <= steps; i++) {
    const x = left + (width * i) / steps;
    let hang = base;
    for (const d of drips) {
      const dx = (x - (left + d.at * width)) / d.w;
      hang += d.len * Math.exp(-(dx ** 4));
    }
    lower.push(`${x.toFixed(1)} ${(edgeY(tier, x) + hang).toFixed(1)}`);
  }
  const upper = [];
  for (let i = steps; i >= 0; i -= 10) {
    const x = left + (width * i) / steps;
    upper.push(`${x.toFixed(1)} ${(edgeY(tier, x) - 1).toFixed(1)}`);
  }
  return `M ${lower.join(' L ')} L ${upper.join(' L ')} Z`;
}

function makeDrips(seed, count, maxLen, w) {
  const rand = seeded(seed);
  return Array.from({ length: count }, (_, i) => ({
    at: (i + 0.5) / count + (rand() - 0.5) * 0.04,
    len: 5 + rand() * maxLen,
    w: w * (0.8 + rand() * 0.5),
  }));
}

function pearlsAlong(tier, gap) {
  const out = [];
  for (let x = CX - tier.rx + gap / 2; x <= CX + tier.rx - gap / 2; x += gap) {
    out.push({ x, y: edgeY(tier, x, true) - 1 });
  }
  return out;
}

function makeSprinkles(seed) {
  const rand = seeded(seed);
  const colors = ['#e8c26e', '#6d0f3c', '#b39ddb', '#ffffff', '#f48fb1'];
  const out = [];
  while (out.length < 18) {
    const x = CX - BOTTOM.rx + 14 + rand() * (BOTTOM.rx * 2 - 28);
    const y = BOTTOM.cy + 44 + rand() * (BOTTOM.h - 30);
    if (Math.abs(x - CX) < 78 && y < BOTTOM.cy + 84) continue; // keep the name clear
    out.push({ x, y, r: rand() * 180, c: colors[out.length % colors.length] });
  }
  return out;
}

// Sugar roses ringing the join between the tiers (front half only).
const SUGAR_ROSES = Array.from({ length: 7 }, (_, i) => {
  const a = (Math.PI * (18 + i * 24)) / 180;
  return { x: CX + (TOP.rx + 4) * Math.cos(a), y: TOP.cy + TOP.h + (TOP.ry + 2) * Math.sin(a), tone: ROSE_ORDER[i % ROSE_ORDER.length] };
}).sort((a, b) => a.y - b.y);

function candlePositions(n) {
  const spread = Math.min(124, 30 * (n - 1));
  return Array.from({ length: n }, (_, i) => {
    const x = n === 1 ? CX : CX - spread / 2 + (spread * i) / (n - 1);
    const y = TOP.cy + (i % 2 === 0 ? 4 : -4);
    return { i, x, y, dir: i % 2 === 0 ? 1 : -1, delay: (i * 0.37) % 1, dur: 0.9 + ((i * 0.23) % 0.5) };
  });
}

const CANDLE_H = 50;
const SMOKE_PATH = 'M0 0 C -7 -12 7 -24 0 -36 C -7 -48 7 -60 0 -74';

const MIC_ERRORS = {
  denied: 'Mic is blocked. No worries, hold the button below 💨',
  nodevice: "I can't find a microphone. Hold the button below instead 💨",
  busy: 'Another app is using the mic. Hold the button below instead 💨',
  insecure: "Your browser won't share the mic here, so hold the button instead 💨",
  unsupported: "Your browser won't share the mic here, so hold the button instead 💨",
  failed: "The mic didn't start. Hold the button below instead 💨",
};

export default function Cake({ music, onDone }) {
  const root = useRef(null);
  const meterRef = useRef(null);
  const text = birthday.cake;
  const count = birthday.candles;

  const song = useMemo(() => buildSong(birthday.nameSyllables), []);
  const geo = useMemo(
    () => ({
      bottomDrips: dripSkirt(BOTTOM, makeDrips(7, 11, 26, 7), 7),
      topDrips: dripSkirt(TOP, makeDrips(19, 8, 22, 6), 6),
      bottomPearls: pearlsAlong(BOTTOM, 12),
      topPearls: pearlsAlong(TOP, 11),
      sprinkles: makeSprinkles(3),
      candles: candlePositions(count),
    }),
    [count]
  );
  const drawOrder = useMemo(() => [...geo.candles].sort((a, b) => a.y - b.y), [geo]);

  const [phase, setPhase] = useState('intro'); // intro → sing → wish → blow → dark → done
  const [active, setActive] = useState(-1);
  const [lit, setLit] = useState(() => Array(count).fill(true));
  const [mic, setMic] = useState('idle'); // idle | starting | calibrating | listening | error
  const [micError, setMicError] = useState('');

  const litRef = useRef(lit);
  const hp = useRef(Array.from({ length: count }, () => 0.6 + Math.random() * 0.8));
  const micLevel = useRef(0);
  const holdLevel = useRef(0);
  const holding = useRef(false);
  const detector = useRef(null);
  const timers = useRef([]);
  const done = useRef(false);
  const alive = useRef(true);

  const later = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  const { contextSafe } = useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline({ onComplete: () => setPhase('sing') });
      if (reduced) {
        tl.from('.ck-cake-svg', { opacity: 0, duration: 0.8 });
        return;
      }
      tl.from('.ck-plate', { scaleX: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'power3.out' })
        .from('.ck-tier-bottom', { y: -280, opacity: 0, duration: 0.95, ease: 'bounce.out' }, '-=0.2')
        .from('.ck-tier-top', { y: -280, opacity: 0, duration: 0.95, ease: 'bounce.out' }, '-=0.5')
        .from('.ck-pearl', { scale: 0, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.01, ease: 'back.out(3)' }, '-=0.45')
        .from('.ck-sugar', { scale: 0, rotation: -90, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.07, ease: 'back.out(2.4)' }, '-=0.3')
        .from('.ck-candle-body', { y: -46, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(2)' }, '-=0.25')
        .from('.ck-flame-pop', { scale: 0, transformOrigin: '50% 100%', duration: 0.4, stagger: 0.14, ease: 'back.out(3)' })
        .from('.ck-glow', { opacity: 0, duration: 0.5, stagger: 0.14 }, '<');
    },
    { scope: root }
  );

  const smoke = contextSafe((i) => {
    const group = root.current?.querySelector(`[data-candle="${i}"]`);
    if (!group) return;
    const path = group.querySelector('.ck-smoke');
    const embers = group.querySelectorAll('.ck-ember');
    gsap
      .timeline()
      .set(path, { opacity: 0.85, y: 0 })
      .fromTo(path, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.9, ease: 'power1.out' })
      .to(path, { drawSVG: '100% 100%', y: -26, opacity: 0, duration: 1.6, ease: 'power1.in' }, '-=0.25');
    embers.forEach((ember) => {
      gsap.fromTo(
        ember,
        { x: 0, y: 0, opacity: 1, scale: 1 },
        { x: gsap.utils.random(-14, 14), y: gsap.utils.random(-34, -14), opacity: 0, scale: 0.3, duration: gsap.utils.random(0.5, 0.9), ease: 'power2.out' }
      );
    });
  });

  const stopMic = useCallback(() => {
    detector.current?.stop();
    detector.current = null;
    micLevel.current = 0;
  }, []);

  const extinguish = useCallback(
    (i) => {
      if (!litRef.current[i]) return;
      litRef.current = litRef.current.map((v, j) => (j === i ? false : v));
      setLit(litRef.current);
      music.poof();
      smoke(i);
      if (litRef.current.every((v) => !v)) {
        stopMic();
        holding.current = false;
        setPhase('dark');
        later(() => {
          setPhase('done');
          grandCelebration();
          music.sparkle();
        }, 1000);
      }
    },
    [music, smoke, stopMic, later, setLit, setPhase]
  );

  // Sing along, then wish, then blow.
  useEffect(() => {
    if (phase === 'sing') {
      music.stop(0.2);
      later(() => {
        music.play({
          song,
          tempo: 100,
          gain: 1,
          onNote: (i) => alive.current && setActive(i),
          onEnd: () => alive.current && setPhase((p) => (p === 'sing' ? 'wish' : p)),
        });
      }, 1400);
    } else if (phase === 'wish') {
      later(() => setPhase((p) => (p === 'wish' ? 'blow' : p)), 3200);
    }
  }, [phase, music, song, later]);

  // Per-frame blow loop: everything goes through refs + a CSS variable.
  useEffect(() => {
    if (phase !== 'blow') return undefined;
    let raf = 0;
    let last = performance.now();
    let smooth = 0;
    const el = root.current;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const holdTarget = holding.current ? 0.85 : 0;
      holdLevel.current += (holdTarget - holdLevel.current) * (holding.current ? 0.12 : 0.08);
      const target = Math.max(micLevel.current, holdLevel.current);
      smooth += (target - smooth) * 0.25;
      el.style.setProperty('--ck-blow', smooth.toFixed(3));
      if (meterRef.current) meterRef.current.style.transform = `scaleX(${smooth.toFixed(3)})`;
      if (smooth > 0.06) {
        hp.current.forEach((h, i) => {
          if (!litRef.current[i]) return;
          hp.current[i] = h - smooth * dt * 0.95 * (0.7 + Math.random() * 0.6);
          if (hp.current[i] <= 0) extinguish(i);
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.style.setProperty('--ck-blow', '0');
    };
  }, [phase, extinguish]);

  // Space bar blows too (when not typing into / pressing another control).
  useEffect(() => {
    if (phase !== 'blow') return undefined;
    const down = (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, input, textarea')) return;
      e.preventDefault();
      holding.current = true;
    };
    const up = (e) => {
      if (e.code === 'Space') holding.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [phase]);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
      stopMic();
    };
  }, [stopMic]);

  const startMic = async () => {
    if (detector.current) return;
    setMic('starting');
    setMicError('');
    const d = createBlowDetector({
      onLevel: (v) => {
        micLevel.current = v;
      },
      onCalibrated: () => alive.current && setMic('listening'),
    });
    detector.current = d;
    try {
      await d.start();
      if (alive.current) setMic((m) => (m === 'listening' ? m : 'calibrating'));
    } catch (err) {
      detector.current = null;
      if (!alive.current) return;
      setMic('error');
      setMicError(MIC_ERRORS[err.reason] || MIC_ERRORS.failed);
    }
  };

  const skipSong = () => {
    music.stop(0.2);
    setPhase('wish');
  };

  const press = (on) => (e) => {
    if (on) e.currentTarget.setPointerCapture?.(e.pointerId);
    holding.current = on;
  };

  const lineIndex = Math.max(0, SONG_LINES.findIndex(([a, b]) => active >= a && active < b));
  const joins = (i) => i > 0 && ['Hap', 'birth', birthday.nameSyllables[0]].includes(song[i - 1].syllable);
  // Group a lyric line's syllables into words so a word never wraps mid-way.
  const wordsOf = (a, b) => {
    const words = [];
    for (let i = a; i < b; i++) {
      if (i > a && joins(i)) words[words.length - 1].push(i);
      else words.push([i]);
    }
    return words;
  };
  const litCount = lit.filter(Boolean).length;
  const micStatus = {
    starting: 'asking for the mic…',
    calibrating: 'listening… stay quiet for a sec',
    listening: 'now blow! 🌬️',
  }[mic];

  return (
    <section
      ref={root}
      className={`bd-scene ck-scene ck-phase-${phase}`}
      style={{ '--ck-lit': litCount / count }}
      aria-live="polite"
    >
      <div className="ck-room-glow" aria-hidden="true" />

      <div className="ck-stage">
        <div className="ck-top">
          {phase === 'sing' && (
            <>
              <span className="cel-kicker ck-kicker">{text.singIntro}</span>
              <div className="ck-lyrics">
                {SONG_LINES.map(([a, b], li) => (
                  <p
                    key={li}
                    className={`ck-line${li === lineIndex ? ' is-current' : li < lineIndex ? ' is-past' : ''}`}
                  >
                    {wordsOf(a, b).map((word) => (
                      <span key={word[0]} className="ck-word">
                        {word.map((i) => (
                          <span
                            key={i}
                            className={`ck-syl${i === active ? ' is-on' : i < active ? ' is-sung' : ''}`}
                          >
                            {song[i].syllable}
                          </span>
                        ))}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            </>
          )}
          {phase === 'wish' && <p className="ck-prompt ck-fade">{text.wishPrompt}</p>}
          {phase === 'blow' && (
            <>
              <p className="ck-prompt ck-prompt-big ck-fade">{text.blowPrompt}</p>
              <p className="ck-status">
                {micStatus || (mic === 'error' ? micError : 'blow into your mic, hold the button, or tap the flames')}
              </p>
            </>
          )}
          {phase === 'done' && (
            <div className="ck-done ck-fade">
              <h2 className="ck-done-title">{text.doneTitle}</h2>
              <p className="ck-done-text">{text.doneText}</p>
            </div>
          )}
        </div>

        <div className="ck-cake-wrap">
          <svg className="ck-cake-svg" viewBox="0 30 400 360" role="img" aria-label={`A birthday cake with ${litCount} lit candles`}>
            <defs>
              <linearGradient id="ck-sponge" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#e2bf9c" />
                <stop offset="0.32" stopColor="#fff1dc" />
                <stop offset="0.7" stopColor="#f6dcc0" />
                <stop offset="1" stopColor="#cfa27d" />
              </linearGradient>
              <linearGradient id="ck-sponge-top" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#e8b3c0" />
                <stop offset="0.32" stopColor="#ffe3ea" />
                <stop offset="0.7" stopColor="#f9cfd9" />
                <stop offset="1" stopColor="#d89aab" />
              </linearGradient>
              <linearGradient id="ck-frost-rose" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#ffc2d6" />
                <stop offset="0.5" stopColor="#f48fb1" />
                <stop offset="1" stopColor="#dc6f98" />
              </linearGradient>
              <linearGradient id="ck-frost-wine" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#f0e4fb" />
                <stop offset="0.55" stopColor="#caaeeb" />
                <stop offset="1" stopColor="#a585d6" />
              </linearGradient>
              <radialGradient id="ck-plate" cx="0.5" cy="0.35" r="0.7">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.7" stopColor="#f1e4ea" />
                <stop offset="1" stopColor="#c9b3be" />
              </radialGradient>
              <radialGradient id="ck-pearl" cx="0.35" cy="0.35" r="0.7">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#e9d5dc" />
              </radialGradient>
              <radialGradient id="ck-flame" cx="0.5" cy="0.75" r="0.7">
                <stop offset="0" stopColor="#fffdf2" />
                <stop offset="0.35" stopColor="#ffe28a" />
                <stop offset="0.7" stopColor="#ffa94d" />
                <stop offset="1" stopColor="#ff6a3d" stopOpacity="0.6" />
              </radialGradient>
              <radialGradient id="ck-glow">
                <stop offset="0" stopColor="#ffd98a" stopOpacity="0.75" />
                <stop offset="0.45" stopColor="#ffb86b" stopOpacity="0.22" />
                <stop offset="1" stopColor="#ff9a5a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="ck-candle-shade" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#000" stopOpacity="0.22" />
                <stop offset="0.4" stopColor="#fff" stopOpacity="0.18" />
                <stop offset="1" stopColor="#000" stopOpacity="0.28" />
              </linearGradient>
              <pattern id="ck-stripes" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
                <rect width="9" height="9" fill="#fff4e6" />
                <rect width="4" height="9" fill="#f48fb1" />
              </pattern>
            </defs>

            {/* Plate */}
            <g className="ck-plate">
              <ellipse cx={CX} cy={358} rx={184} ry={26} fill="rgba(0,0,0,0.35)" />
              <ellipse cx={CX} cy={352} rx={178} ry={26} fill="url(#ck-plate)" />
              <ellipse cx={CX} cy={349} rx={160} ry={19} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" />
            </g>

            {/* Bottom tier */}
            <g className="ck-tier-bottom">
              <path d={tierBody(BOTTOM)} fill="url(#ck-sponge)" />
              <ellipse cx={CX} cy={BOTTOM.cy} rx={BOTTOM.rx} ry={BOTTOM.ry} fill="url(#ck-frost-rose)" />
              <path d={geo.bottomDrips} fill="url(#ck-frost-rose)" />
              <ellipse cx={CX - 40} cy={BOTTOM.cy - 6} rx={70} ry={8} fill="#fff" opacity="0.22" />
              {geo.sprinkles.map((s, i) => (
                <rect key={i} x={s.x - 3.5} y={s.y - 1.2} width="7" height="2.4" rx="1.2" fill={s.c} transform={`rotate(${s.r} ${s.x} ${s.y})`} />
              ))}
              <text x={CX} y={BOTTOM.cy + 70} textAnchor="middle" className="ck-cake-name">
                {birthday.name}
              </text>
              {geo.bottomPearls.map((p, i) => (
                <circle key={i} className="ck-pearl" cx={p.x} cy={p.y} r="4.6" fill="url(#ck-pearl)" />
              ))}
            </g>

            {/* Top tier */}
            <g className="ck-tier-top">
              <path d={tierBody(TOP)} fill="url(#ck-sponge-top)" />
              <ellipse cx={CX} cy={TOP.cy} rx={TOP.rx} ry={TOP.ry} fill="url(#ck-frost-wine)" />
              <path d={geo.topDrips} fill="url(#ck-frost-wine)" />
              <ellipse cx={CX - 26} cy={TOP.cy - 4} rx={44} ry={5} fill="#fff" opacity="0.18" />
              {geo.topPearls.map((p, i) => (
                <circle key={i} className="ck-pearl" cx={p.x} cy={p.y} r="4" fill="url(#ck-pearl)" />
              ))}
            </g>

            {/* Sugar roses where the tiers meet */}
            <g className="ck-sugar-roses">
              {SUGAR_ROSES.map((r, i) => (
                <g key={i} className="ck-sugar">
                  <Rose tone={r.tone} x={r.x - 15} y={r.y - 15} width="30" height="30" className="ck-sugar-rose" />
                </g>
              ))}
            </g>

            {/* Candle glows sit behind every candle */}
            {geo.candles.map((c) => (
              <circle
                key={`glow-${c.i}`}
                className={`ck-glow${lit[c.i] ? '' : ' is-out'}`}
                cx={c.x}
                cy={c.y - CANDLE_H - 18}
                r="42"
                fill="url(#ck-glow)"
                style={{ animationDelay: `${-c.delay}s` }}
              />
            ))}

            {/* Candles, back row first */}
            {drawOrder.map((c) => {
              const top = c.y - CANDLE_H;
              return (
                <g
                  key={c.i}
                  data-candle={c.i}
                  className={`ck-candle${lit[c.i] ? '' : ' is-out'}`}
                  onClick={() => phase === 'blow' && extinguish(c.i)}
                >
                  <g className="ck-candle-body">
                    <rect x={c.x - 5} y={top} width="10" height={CANDLE_H} rx="2" fill="url(#ck-stripes)" />
                    <rect x={c.x - 5} y={top} width="10" height={CANDLE_H} rx="2" fill="url(#ck-candle-shade)" />
                    <ellipse cx={c.x} cy={top} rx="5" ry="1.8" fill="#fff8ee" />
                    <path d={`M ${c.x} ${top} q 1.5 -3 -0.5 -7`} stroke="#2b1a12" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  </g>
                  <g transform={`translate(${c.x} ${top - 6})`}>
                    <path className="ck-smoke" d={SMOKE_PATH} />
                    {[0, 1, 2, 3].map((k) => (
                      <circle key={k} className="ck-ember" r="1.3" fill="#ffb86b" />
                    ))}
                    <g className="ck-flame-pop">
                      <g className="ck-flame-out">
                        <g className="ck-flame-lean" style={{ '--ck-dir': c.dir }}>
                          <g className="ck-flame-flicker" style={{ animationDuration: `${c.dur}s`, animationDelay: `${-c.delay}s` }}>
                            <path d="M0 -36 C 6 -24 10 -13 7 -5 C 5 0.5 -5 0.5 -7 -5 C -10 -13 -6 -24 0 -36 Z" fill="url(#ck-flame)" />
                            <path d="M0 -21 C 3 -14 5 -8 3.5 -3.5 C 2 -0.5 -2 -0.5 -3.5 -3.5 C -5 -8 -3 -14 0 -21 Z" fill="#fffbe8" opacity="0.92" />
                            <ellipse cx="0" cy="-2.5" rx="3.2" ry="3.6" fill="#7fb2ff" opacity="0.5" />
                          </g>
                        </g>
                      </g>
                    </g>
                    {/* Generous invisible hit area so tapping a flame is easy on phones */}
                    <circle cx="0" cy="-16" r="18" fill="transparent" />
                  </g>
                </g>
              );
            })}
          </svg>

          {phase === 'blow' && (
            <div className="ck-wind" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} style={{ left: `${10 + i * 10}%`, animationDelay: `${(i * 0.17) % 0.9}s` }} />
              ))}
            </div>
          )}
        </div>

        <div className="ck-controls">
          {phase === 'sing' && (
            <button type="button" className="bd-btn-ghost ck-small" onClick={skipSong}>
              skip the song
            </button>
          )}
          {phase === 'blow' && (
            <>
              {mic !== 'error' && (mic === 'idle' || mic === 'starting') && (
                <button type="button" className="bd-btn" onClick={startMic} disabled={mic === 'starting'}>
                  🎤 Blow into your mic
                </button>
              )}
              <button
                type="button"
                className="bd-btn-ghost ck-hold"
                onPointerDown={press(true)}
                onPointerUp={press(false)}
                onPointerCancel={press(false)}
                onLostPointerCapture={press(false)}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                    e.preventDefault();
                    holding.current = true;
                  }
                }}
                onKeyUp={() => (holding.current = false)}
              >
                hold to blow 💨
              </button>
              <div className="ck-meter" aria-hidden="true">
                <span ref={meterRef} />
              </div>
            </>
          )}
          {phase === 'done' && (
            <button type="button" className="bd-btn ck-fade" onClick={finish}>
              {text.doneButton} ↓
            </button>
          )}
        </div>
      </div>

      <button type="button" className="bd-skip" onClick={finish}>
        skip ⏭
      </button>
    </section>
  );
}
