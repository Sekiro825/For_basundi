'use client';

import { useRef } from 'react';
import { Fireworks } from 'fireworks-js';
import { birthday } from '../../birthdayConfig';
import { gsap, useGSAP, SplitText, ScrollTrigger, prefersReducedMotion } from '../../lib/gsap';
import './celebration-a.css';

// Rose, gold, lavender: the show drifts between them every ~2.5s.
const HUES = [
  { min: 330, max: 355 },
  { min: 35, max: 50 },
  { min: 265, max: 290 },
];

const FIREWORKS_OPTIONS = {
  autoresize: true,
  hue: HUES[0],
  rocketsPoint: { min: 12, max: 88 },
  opacity: 0.3,
  acceleration: 1.03,
  friction: 0.965,
  gravity: 1.1,
  particles: 64,
  explosion: 6,
  intensity: 18,
  flickering: 35,
  traceLength: 3,
  traceSpeed: 7,
  lineStyle: 'round',
  lineWidth: { explosion: { min: 1, max: 2.4 }, trace: { min: 0.8, max: 1.6 } },
  brightness: { min: 58, max: 82 },
  decay: { min: 0.012, max: 0.022 },
  delay: { min: 36, max: 72 },
  // Click-to-launch is handled below (the built-in handler mis-measures
  // inside a scrolled page and can get stuck "held" after a touch-scroll).
  mouse: { click: false, move: false, max: 1 },
  sound: { enabled: false },
};

// A calligraphic underline: a small curl, a long easy wave, a flick at the end.
const SWASH_D = 'M24 30 C10 40 22 55 44 47 C92 29 152 26 214 34 S332 50 404 24';

const pad = (n) => String(n).padStart(2, '0');

export default function Hero() {
  const rootRef = useRef(null);
  const fxRef = useRef(null);
  const contentRef = useRef(null);
  const dateLine = `${pad(birthday.day)} · ${pad(birthday.month)} · ${new Date().getFullYear()}`;

  useGSAP(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    const fxEl = fxRef.current;
    if (!root || !content || !fxEl) return;

    const date = root.querySelector('.cel-hero-date');
    const title = root.querySelector('.cel-hero-title');
    const name = root.querySelector('.cel-hero-name');
    const swash = root.querySelector('.cel-hero-swash');
    const swashPath = root.querySelector('.cel-hero-swash-path');
    const hint = root.querySelector('.cel-hero-hint');
    const cue = root.querySelector('.cel-hero-cue');
    const cueInner = root.querySelector('.cel-hero-cue-inner');

    if (prefersReducedMotion()) {
      gsap.from([date, title, name.parentNode, hint, cueInner], {
        autoAlpha: 0,
        duration: 1.2,
        stagger: 0.2,
        ease: 'power1.out',
        delay: 0.15,
      });
      return undefined;
    }

    // ---- Intro -------------------------------------------------------
    const split = SplitText.create(title, {
      type: 'words,chars',
      mask: 'chars',
      wordsClass: 'cel-hero-word',
      charsClass: 'cel-hero-char',
    });

    gsap.set(swash, { autoAlpha: 0 });

    const intro = gsap.timeline({ delay: 0.2, defaults: { ease: 'expo.out' } });
    intro
      .from(date, { autoAlpha: 0, y: 14, duration: 1.2 })
      // yPercent a little past 110 so glyphs clear the mask's descender padding.
      .from(split.chars, { yPercent: 130, duration: 1.3, stagger: 0.035 }, 0.15)
      .fromTo(
        name,
        { clipPath: 'inset(-40% 110% -40% -10%)' },
        {
          clipPath: 'inset(-40% -10% -40% -10%)',
          duration: 1.6,
          ease: 'power2.inOut',
          clearProps: 'clipPath',
        },
        '-=0.55',
      )
      .set(swash, { autoAlpha: 1 }, '-=0.5')
      .from(swashPath, { drawSVG: 0, duration: 1.2, ease: 'power2.inOut' }, '<')
      .from(hint, { autoAlpha: 0, y: 12, duration: 1.1 }, '-=0.35')
      .from(cueInner, { autoAlpha: 0, y: -10, duration: 1 }, '<0.2');

    // ---- Parallax on the way out ---------------------------------------
    gsap.to(content, {
      yPercent: -14,
      opacity: 0.4,
      ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
    gsap.to(cue, {
      autoAlpha: 0,
      ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: '+=160', scrub: true },
    });

    // ---- Fireworks -----------------------------------------------------
    const fw = new Fireworks(fxEl, FIREWORKS_OPTIONS);
    let disposed = false;
    fw.start();

    let hueIndex = 0;
    const hueTimer = window.setInterval(() => {
      hueIndex = (hueIndex + 1) % HUES.length;
      fw.updateOptions({ hue: HUES[hueIndex] });
    }, 2500);

    // Send one rocket to (x, y) in canvas pixels.
    const fireAt = (x, y) => {
      const mouse = fw.mouse;
      if (disposed || !fw.isRunning || !mouse || typeof fw.createTrace !== 'function') return;
      try {
        mouse.x = x;
        mouse.y = y;
        mouse.active = true;
        fw.createTrace();
      } catch {
        // the show goes on without this one
      }
      mouse.active = false;
    };

    const onClick = (event) => {
      const rect = fxEl.getBoundingClientRect();
      fireAt(event.clientX - rect.left, event.clientY - rect.top);
    };
    root.addEventListener('click', onClick);

    // An opening volley while the title rises.
    [[0.24, 0.26], [0.5, 0.15], [0.76, 0.28]].forEach(([px, py], i) => {
      gsap.delayedCall(0.55 + i * 0.3, () => fireAt(fxEl.clientWidth * px, fxEl.clientHeight * py));
    });

    // Only burn CPU while the hero is on screen.
    ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        if (disposed) return;
        if (self.isActive) fw.start();
        else fw.stop();
      },
    });

    return () => {
      disposed = true;
      window.clearInterval(hueTimer);
      root.removeEventListener('click', onClick);
      fw.stop(true);
      fxEl.replaceChildren(); // stop(true) skips canvas removal when already stopped
    };
  }, { scope: rootRef });

  return (
    <section ref={rootRef} className="cel-section cel-hero" aria-label={`Happy birthday, ${birthday.name}`}>
      <div ref={fxRef} className="cel-hero-fx" aria-hidden="true" />
      <div className="cel-hero-veil" aria-hidden="true" />

      <div ref={contentRef} className="cel-hero-content">
        <p className="cel-kicker cel-hero-date">{dateLine}</p>

        <h1 className="cel-hero-title">
          <span className="cel-hero-line">Happy</span>{' '}
          <span className="cel-hero-line">Birthday</span>
        </h1>

        <div className="cel-hero-signature">
          <p className="cel-hero-name">{birthday.name}</p>
          <svg className="cel-hero-swash" viewBox="0 0 420 64" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="cel-hero-swash-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#b8892f" stopOpacity="0.2" />
                <stop offset="0.2" stopColor="#e8c26e" />
                <stop offset="0.62" stopColor="#fff4e6" />
                <stop offset="1" stopColor="#e8c26e" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <path className="cel-hero-swash-path" d={SWASH_D} />
          </svg>
        </div>

        <p className="cel-hero-hint">scroll slowly, there's more ↓</p>
      </div>

      <div className="cel-hero-cue" aria-hidden="true">
        <div className="cel-hero-cue-inner">
          <span className="cel-hero-cue-line" />
        </div>
      </div>
    </section>
  );
}
