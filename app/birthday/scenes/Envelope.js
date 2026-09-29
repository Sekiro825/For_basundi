'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '../lib/gsap';
import { birthday } from '../birthdayConfig';

export default function Envelope({ music, onOpened }) {
  const root = useRef(null);
  const opened = useRef(false);

  const { contextSafe } = useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.cel-kicker', { opacity: 0, y: 10, duration: 0.8 })
        .from('.bd-env-title', { opacity: 0, y: 20, filter: 'blur(10px)', duration: 1.1 }, '-=0.5')
        .from('.bd-envelope', { opacity: 0, y: 80, rotateX: 35, scale: 0.9, duration: 1.3 }, '-=0.7')
        .from('.bd-env-hint', { opacity: 0, duration: 0.8 }, '-=0.3');
      gsap.to('.bd-env-float', { y: -10, rotation: 0.6, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true });
    },
    { scope: root }
  );

  const open = contextSafe(() => {
    if (opened.current) return;
    opened.current = true;
    root.current.querySelector('.bd-envelope').classList.add('is-open');
    music.unlock();
    music.sparkle();

    const tl = gsap.timeline({ onComplete: onOpened });
    tl.to('.bd-env-hint', { autoAlpha: 0, duration: 0.3 }, 0)
      .to('.bd-env-seal', { scale: 1.15, duration: 0.15, ease: 'power2.out' }, 0)
      .to('.bd-env-seal-half:first-child', { x: -50, y: 150, rotation: -75, opacity: 0, duration: 0.9, ease: 'power2.in' })
      .to('.bd-env-seal-half:last-child', { x: 56, y: 160, rotation: 85, opacity: 0, duration: 0.9, ease: 'power2.in' }, '<')
      .to('.bd-env-flap', { rotateX: 180, transformPerspective: 900, duration: 0.85, ease: 'power2.inOut' }, '<0.1')
      .set('.bd-env-flap', { zIndex: 1 }, '<0.45')
      .to('.bd-env-card', { yPercent: -64, duration: 1.05, ease: 'power3.out' }, '>-0.1')
      .set('.bd-env-card', { zIndex: 6 })
      .to('.bd-env-card', { yPercent: -24, scale: 1.3, duration: 0.9, ease: 'power2.inOut' })
      .to(['.bd-env-front', '.bd-env-back', '.bd-env-flap'], { y: 90, opacity: 0, duration: 0.6, ease: 'power2.in' }, '<')
      .to(['.bd-env-title', '.cel-kicker'], { opacity: 0, y: -20, duration: 0.5 }, '<')
      .to({}, { duration: 0.7 });
  });

  return (
    <section className="bd-scene bd-env-scene" ref={root}>
      <div className="bd-env-inner">
        <span className="cel-kicker">a letter, sealed with love</span>
        <h1 className="bd-env-title">for {birthday.name}</h1>
        <div className="bd-env-float">
          <button type="button" className="bd-envelope" onClick={open} aria-label="Open the envelope">
            <span className="bd-env-back" />
            <span className="bd-env-card">
              <span className="bd-env-card-script">Happy Birthday</span>
              <span className="bd-env-card-sub">my love</span>
            </span>
            <span className="bd-env-front" />
            <span className="bd-env-flap" />
            <span className="bd-env-seal" aria-hidden="true">
              <span className="bd-env-seal-half">{birthday.name[0]}</span>
              <span className="bd-env-seal-half">{birthday.name[0]}</span>
            </span>
          </button>
        </div>
        <p className="bd-env-hint">tap the seal ✨</p>
      </div>
    </section>
  );
}
