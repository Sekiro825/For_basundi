'use client';

import { useRef, useState } from 'react';
import { birthday } from '../../birthdayConfig';
import { gsap, useGSAP, ScrollTrigger, prefersReducedMotion } from '../../lib/gsap';
import './celebration-a.css';

// Deterministic "scattered on the table" tilts, in degrees.
const TILTS = [-6, 4, -3, 7, -5, 3, -4, 6, -2, 5, -7, 3];

function Polaroid({ memory, index }) {
  const [broken, setBroken] = useState(false);
  const tilt = TILTS[index % TILTS.length];
  const tone = index % 3 === 1 ? 'gold' : 'rose';
  const alt = memory.caption || 'A memory of us';

  return (
    <li className="cel-mem-slide" data-tilt={tilt} style={{ '--cel-mem-tilt': `${tilt}deg` }}>
      <figure className="cel-mem-card" data-tone={tone}>
        <span className="cel-mem-tape" aria-hidden="true" />
        <div className="cel-mem-photo">
          {memory.src && !broken ? (
            <img
              className="cel-mem-img"
              src={memory.src}
              alt={alt}
              decoding="async"
              draggable={false}
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="cel-mem-ph" role="img" aria-label={alt} />
          )}
        </div>
        <figcaption className="cel-mem-cap">
          {memory.caption ? <span className="cel-mem-caption">{memory.caption}</span> : null}
          {memory.date ? <span className="cel-mem-date">{memory.date}</span> : null}
        </figcaption>
      </figure>
    </li>
  );
}

export default function Memories({ memories }) {
  const rootRef = useRef(null);
  const setupCount = useRef(0);
  const list = Array.isArray(memories) ? memories.filter(Boolean) : [];

  useGSAP(() => {
    const root = rootRef.current;
    if (!root || !list.length) return;

    const head = root.querySelector('.cel-mem-head');
    const viewport = root.querySelector('.cel-mem-viewport');
    const track = root.querySelector('.cel-mem-track');
    const bar = root.querySelector('.cel-mem-progress-bar');
    const reduced = prefersReducedMotion();

    // Heading: a gentle rise (just a fade under reduced motion).
    gsap.from(head.children, {
      autoAlpha: 0,
      y: reduced ? 0 : 28,
      duration: reduced ? 0.8 : 1.1,
      stagger: 0.12,
      ease: reduced ? 'power1.out' : 'expo.out',
      scrollTrigger: { trigger: root, start: 'top 78%', toggleActions: 'play none none reverse' },
    });

    if (reduced) return; // CSS turns the track into a scroll-snap row

    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

    // The horizontal journey. Must stay linear: it drives the per-card triggers.
    const journey = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root,
        pin: true,
        start: 'top top',
        end: () => '+=' + distance(),
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    journey.to(track, { x: () => -distance(), duration: 1 }, 0);
    if (bar) journey.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);

    // Each polaroid straightens as it reaches the centre, then leans the other
    // way as it leaves; the photo drifts inside its frame for parallax.
    gsap.utils.toArray('.cel-mem-slide', root).forEach((slide) => {
      const card = slide.querySelector('.cel-mem-card');
      if (!card) return;
      const tilt = Number(slide.dataset.tilt) || 0;
      const img = slide.querySelector('.cel-mem-img');

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: slide,
          containerAnimation: journey,
          start: 'left right',
          end: 'right left',
          scrub: true,
        },
      });
      tl.fromTo(card, { rotation: tilt, y: 30 }, { rotation: 0, y: 0, duration: 1, ease: 'sine.out' })
        .to(card, { rotation: -tilt * 0.45, y: 12, duration: 1, ease: 'sine.in' });
      if (img) tl.fromTo(img, { xPercent: -8 }, { xPercent: 8, duration: 2 }, 0);
    });

    // The handwritten ending settles in as it arrives.
    const more = root.querySelector('.cel-mem-more');
    if (more) {
      gsap.from(more, {
        autoAlpha: 0,
        y: 24,
        rotation: -9,
        ease: 'none',
        scrollTrigger: {
          trigger: more.parentNode,
          containerAnimation: journey,
          start: 'left 90%',
          end: 'center 55%',
          scrub: true,
        },
      });
    }

    // If the album changes after mount, these triggers were created after the
    // sections below; re-sort so pin spacing is measured top to bottom.
    setupCount.current += 1;
    if (setupCount.current > 1) {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    }
  }, { scope: rootRef, dependencies: [memories], revertOnUpdate: true });

  if (!list.length) return null;

  return (
    <section ref={rootRef} className="cel-section cel-mem">
      <header className="cel-mem-head">
        <h2 className="cel-h2">{birthday.memoriesTitle}</h2>
        {birthday.memoriesSubtitle ? <p className="cel-mem-sub">{birthday.memoriesSubtitle}</p> : null}
      </header>

      <div className="cel-mem-viewport">
        <ol className="cel-mem-track">
          {list.map((memory, i) => (
            <Polaroid key={`${memory.src || 'memory'}-${i}`} memory={memory} index={i} />
          ))}
          <li className="cel-mem-end">
            <p className="cel-mem-more">
              and a thousand more to come…
              <span className="cel-mem-more-heart" aria-hidden="true">♥</span>
            </p>
          </li>
        </ol>
      </div>

      <div className="cel-mem-progress" aria-hidden="true">
        <span className="cel-mem-progress-bar" />
      </div>
    </section>
  );
}
