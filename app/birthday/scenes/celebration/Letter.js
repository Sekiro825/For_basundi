'use client';

import { useRef } from 'react';
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '../../lib/gsap';
import { birthday } from '../../birthdayConfig';
import './celebration-b.css';

const { letter } = birthday;

const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

// A softly torn (deckled) paper edge. Seeded, so it's identical on every render.
function deckleEdge() {
  let seed = 30092026;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const bite = () => (rand() * 2.8).toFixed(2);
  const pct = (i, n) => ((i / n) * 100).toFixed(2);
  const H = 44;
  const V = 80;
  const pts = [];
  for (let i = 0; i <= H; i++) pts.push(`${pct(i, H)}% ${bite()}px`);
  for (let i = 1; i <= V; i++) pts.push(`calc(100% - ${bite()}px) ${pct(i, V)}%`);
  for (let i = H - 1; i >= 0; i--) pts.push(`${pct(i, H)}% calc(100% - ${bite()}px)`);
  for (let i = V - 1; i >= 1; i--) pts.push(`${bite()}px ${pct(i, V)}%`);
  return `polygon(${pts.join(', ')})`;
}

const DECKLE = deckleEdge();

const DATE = new Date(2000, birthday.month - 1, birthday.day).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
});

export default function Letter() {
  const rootRef = useRef(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const q = (s) => root.querySelector(s);
      const kicker = q('.cel-letter-kicker');
      const sheet = q('.cel-letter-sheet');
      const date = q('.cel-letter-date');
      const greeting = q('.cel-letter-greeting');
      const paragraphs = root.querySelectorAll('.cel-letter-p');
      const close = q('.cel-letter-close');
      const signoff = q('.cel-letter-signoff');
      const name = q('.cel-letter-name');
      const underline = q('.cel-letter-underline');
      const seal = q('.cel-letter-seal');
      const reduced = prefersReducedMotion();

      gsap.from(kicker, {
        opacity: 0,
        y: reduced ? 0 : 16,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: root, start: 'top 80%' },
      });

      if (reduced) {
        const fade = (targets, trigger) =>
          gsap.from(targets, {
            opacity: 0,
            duration: 0.9,
            ease: 'power1.out',
            stagger: 0.2,
            scrollTrigger: { trigger, start: 'top 88%' },
          });
        fade(sheet, sheet);
        fade([date, greeting], greeting);
        paragraphs.forEach((p) => fade(p, p));
        fade([signoff, name, underline, seal], close);
        return;
      }

      // The sheet rises into place, settling at its resting tilt.
      gsap.fromTo(
        sheet,
        { y: 80, rotation: -3, opacity: 0 },
        {
          y: 0,
          rotation: -1,
          opacity: 1,
          duration: 1.4,
          ease: 'power3.out',
          scrollTrigger: { trigger: sheet, start: 'top 92%' },
        }
      );

      // The greeting is "written" left to right.
      gsap
        .timeline({ scrollTrigger: { trigger: greeting, start: 'top 88%' } })
        .from(date, { opacity: 0, x: 12, duration: 0.8, ease: 'power2.out' })
        .fromTo(
          greeting,
          { clipPath: 'inset(-20% 100% -20% -4%)' },
          { clipPath: 'inset(-20% -4% -20% -4%)', duration: 1.3, ease: 'power1.inOut', clearProps: 'clipPath' },
          0.15
        );

      // Each paragraph slides up line by line (re-split responsively on resize / font load).
      paragraphs.forEach((p) => {
        SplitText.create(p, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'cel-letter-line',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 105,
              stagger: 0.1,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: { trigger: p, start: 'top 88%' },
            }),
        });
      });

      // Sign-off, signature, underline, and finally the wax seal is pressed on.
      gsap
        .timeline({ scrollTrigger: { trigger: close, start: 'top 86%' } })
        .from(signoff, { opacity: 0, y: 12, duration: 0.7, ease: 'power2.out' })
        .fromTo(
          name,
          { clipPath: 'inset(-25% 100% -35% -8%)' },
          { clipPath: 'inset(-25% -8% -35% -8%)', duration: 1.5, ease: 'power2.inOut', clearProps: 'clipPath' },
          '-=0.15'
        )
        .fromTo(
          underline.querySelector('path'),
          { drawSVG: '0% 0%' },
          { drawSVG: '0% 100%', duration: 0.9, ease: 'power2.out' },
          '-=0.45'
        )
        .fromTo(
          seal,
          { scale: 1.6, rotation: -40, opacity: 0 },
          { scale: 1, rotation: -12, opacity: 1, duration: 0.6, ease: 'back.out(2.4)' },
          '+=0.1'
        );
    },
    { scope: rootRef }
  );

  return (
    <section className="cel-section cel-letter" ref={rootRef} aria-label={`A letter for ${birthday.name}`}>
      <p className="cel-kicker cel-letter-kicker">a letter, just for you</p>

      <div className="cel-letter-sheet">
        <span className="cel-letter-shadow" aria-hidden="true" />
        <article className="cel-letter-paper" style={{ clipPath: DECKLE }}>
          <p className="cel-letter-date">{DATE}</p>
          <p className="cel-letter-greeting">{letter.greeting}</p>

          {letter.paragraphs.map((text, i) => (
            <p key={i} className="cel-letter-p">
              {text}
            </p>
          ))}

          <div className="cel-letter-close">
            <p className="cel-letter-signoff">{letter.signoff}</p>
            <p className="cel-letter-sign">
              <span className="cel-letter-name">{birthday.from}</span>
              <svg className="cel-letter-underline" viewBox="0 0 220 26" aria-hidden="true" focusable="false">
                <path d="M4 17 C 36 9, 74 6, 112 10 S 170 22, 214 6" />
              </svg>
            </p>
          </div>
        </article>

        {letter.photo?.src ? (
          <figure className="cel-letter-photo">
            <span className="cel-letter-tape" aria-hidden="true" />
            <img src={letter.photo.src} alt={`${birthday.name} and ${birthday.from}`} loading="lazy" decoding="async" />
            {letter.photo.caption ? <figcaption>{letter.photo.caption}</figcaption> : null}
          </figure>
        ) : null}

        <span className="cel-letter-seal" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d={HEART} />
          </svg>
        </span>
      </div>
    </section>
  );
}
