'use client';

import { useRef } from 'react';
import { birthday } from '../../birthdayConfig';
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '../../lib/gsap';
import './celebration-a.css';

// Geometry (SVG user units, viewBox 600 × 340).
const CX = 300;
const CY = 170;
const RX = 252;
const RY = 112;

// Two half-ellipse arcs, starting at the front (bottom) and travelling
// right → behind the sun → left → home again.
const ORBIT_D = `M${CX},${CY + RY} A${RX},${RY} 0 1,0 ${CX},${CY - RY} A${RX},${RY} 0 1,0 ${CX},${CY + RY}`;

// 24 × 24 heart, centred on (12, 12.2).
const HEART_D =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const format = (n) => Math.round(n).toLocaleString('en-IN');

export default function Orbit() {
  const rootRef = useRef(null);
  const { orbit } = birthday;
  const stats = orbit.stats || [];
  const startLabel = `${birthday.day} ${MONTHS[(birthday.month - 1 + 12) % 12]}`;

  useGSAP(() => {
    const root = rootRef.current;
    if (!root) return;

    const title = root.querySelector('.cel-orbit-title');
    const stage = root.querySelector('.cel-orbit-stage');
    const statsList = root.querySelector('.cel-orbit-stats');
    const closing = root.querySelector('.cel-orbit-closing');

    if (prefersReducedMotion()) {
      gsap.from([title, stage, statsList, closing], {
        autoAlpha: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power1.out',
        scrollTrigger: { trigger: root, start: 'top 75%', toggleActions: 'play none none none' },
      });
      return;
    }

    // Heading arrives as the section scrolls in (before the pin starts).
    gsap.from(title, {
      autoAlpha: 0,
      y: 36,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: root, start: 'top 75%', toggleActions: 'play none none reverse' },
    });

    const planet = root.querySelector('.cel-orbit-planet');
    const depth = root.querySelector('.cel-orbit-depth');
    const trail = root.querySelector('.cel-orbit-trail');
    const statEls = gsap.utils.toArray('.cel-orbit-stat', root);

    const split = SplitText.create(closing, {
      type: 'words',
      mask: 'words',
      wordsClass: 'cel-orbit-word',
    });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root,
        pin: true,
        start: 'top top',
        end: '+=160%',
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // One full lap, with a hint of depth (smaller when it's "behind" the sun).
    tl.to(planet, {
      duration: 10,
      motionPath: {
        path: '#cel-orbit-path',
        align: '#cel-orbit-path',
        alignOrigin: [0.5, 0.5],
        autoRotate: false,
      },
    }, 0)
      .fromTo(trail, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 10 }, 0)
      .fromTo(depth, { scale: 1 }, { scale: 0.7, duration: 5, ease: 'sine.inOut', transformOrigin: '50% 50%' }, 0)
      .to(depth, { scale: 1, duration: 5, ease: 'sine.inOut' }, 5);

    // Stats count up one after another as the lap progresses.
    const spacing = statEls.length ? 7.2 / statEls.length : 0;
    statEls.forEach((el, i) => {
      const num = el.querySelector('.cel-orbit-num');
      const target = Number(stats[i]?.value) || 0;
      const counter = { v: 0 };
      const at = 0.4 + i * spacing;
      num.textContent = '0';
      tl.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out' }, at)
        .to(counter, {
          v: target,
          duration: 3.2,
          ease: 'power1.inOut',
          onUpdate: () => {
            num.textContent = format(counter.v);
          },
        }, at + 0.2);
    });

    // The closing line rises word by word at the end of the lap.
    tl.from(split.words, {
      yPercent: 115,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: 'power3.out',
    }, 8.4)
      .to({}, { duration: 0.8 }); // a breath before the pin releases
  }, { scope: rootRef });

  return (
    <section ref={rootRef} className="cel-section cel-orbit">
      <h2 className="cel-h2 cel-orbit-title">{orbit.title}</h2>

      <div className="cel-orbit-stage">
        <svg
          className="cel-orbit-svg"
          viewBox="0 0 600 340"
          role="img"
          aria-label="A little heart travelling once around a glowing sun"
        >
          <defs>
            <radialGradient id="cel-orbit-sun-grad" cx="42%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#fff8ec" />
              <stop offset="35%" stopColor="#f6d98f" />
              <stop offset="70%" stopColor="#e8c26e" />
              <stop offset="100%" stopColor="#f48fb1" />
            </radialGradient>
            <radialGradient id="cel-orbit-halo-grad">
              <stop offset="0%" stopColor="#ffe6b0" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#e8c26e" stopOpacity="0.28" />
              <stop offset="72%" stopColor="#f48fb1" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#f48fb1" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cel-orbit-trail-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f48fb1" />
              <stop offset="50%" stopColor="#ffd6e4" />
              <stop offset="100%" stopColor="#e8c26e" />
            </linearGradient>
            <radialGradient id="cel-orbit-heart-glow">
              <stop offset="0%" stopColor="#ffd6e4" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#f48fb1" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#f48fb1" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cel-orbit-heart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd6e4" />
              <stop offset="100%" stopColor="#f06292" />
            </linearGradient>
          </defs>

          <circle className="cel-orbit-halo" cx={CX} cy={CY} r="104" fill="url(#cel-orbit-halo-grad)" />
          <circle className="cel-orbit-rays" cx={CX} cy={CY} r="64" />
          <circle cx={CX} cy={CY} r="44" fill="url(#cel-orbit-sun-grad)" />

          <path id="cel-orbit-path" className="cel-orbit-path" d={ORBIT_D} />
          <path className="cel-orbit-trail" d={ORBIT_D} />

          <circle className="cel-orbit-start" cx={CX} cy={CY + RY} r="3.5" />
          <text className="cel-orbit-mark" x={CX} y={CY + RY + 46} textAnchor="middle">
            {startLabel}
          </text>

          <g className="cel-orbit-planet">
            <g transform={`translate(${CX} ${CY + RY})`}>
              <g className="cel-orbit-depth">
                <g className="cel-orbit-beat">
                  <circle r="26" fill="url(#cel-orbit-heart-glow)" />
                  <path d={HEART_D} transform="translate(-15 -15.25) scale(1.25)" fill="url(#cel-orbit-heart-grad)" />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>

      <ul className="cel-orbit-stats">
        {stats.map((s) => (
          <li key={s.label} className="cel-orbit-stat">
            <span className="cel-orbit-num">{format(Number(s.value) || 0)}</span>
            <span className="cel-orbit-label">{s.label}</span>
          </li>
        ))}
      </ul>

      <p className="cel-orbit-closing">{orbit.closing}</p>
    </section>
  );
}
