'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '../../lib/gsap';
import { birthday } from '../../birthdayConfig';
import './celebration-b.css';

// Each reason is a string or { text, photo }.
const REASONS = birthday.reasons.map((r) => (typeof r === 'string' ? { text: r } : r));
const TOTAL = REASONS.length;
const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const pad = (n) => String(n).padStart(2, '0');

// The pose of a card sitting `pos` places down from the top of the deck.
function slot(pos) {
  return {
    x: 0,
    y: pos * 10,
    scale: 1 - pos * 0.045,
    rotation: pos === 0 ? 0 : (pos % 2 ? 1 : -1) * (1.2 + pos * 0.9),
    opacity: pos > 3 ? 0 : 1,
  };
}

// Higher cards stack above lower ones. zIndex is always set, never tweened.
const depth = (pos) => TOTAL - pos;

export default function Reasons() {
  const rootRef = useRef(null);
  const deckRef = useRef(null);
  const hintRef = useRef(null);
  const cardsRef = useRef([]);
  // orderRef.current[pos] = index of the card at that position (0 = top).
  const orderRef = useRef(REASONS.map((_, i) => i));
  const busyRef = useRef(false);
  const introRef = useRef(null);
  const dragRef = useRef({ id: null, x0: 0, y0: 0, dx: 0, moved: false });
  const quietUntil = useRef(0);
  const [top, setTop] = useState(0);

  const { contextSafe } = useGSAP(
    () => {
      const cards = cardsRef.current;
      const reduced = prefersReducedMotion();

      orderRef.current.forEach((card, pos) => gsap.set(cards[card], { ...slot(pos), zIndex: depth(pos) }));

      gsap.from(rootRef.current.querySelectorAll('.cel-rsn-head > *'), {
        y: reduced ? 0 : 28,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: rootRef.current, start: 'top 72%' },
      });

      if (reduced) {
        introRef.current = gsap.from([deckRef.current, hintRef.current], {
          opacity: 0,
          duration: 0.8,
          ease: 'power1.out',
          scrollTrigger: { trigger: deckRef.current, start: 'top 85%' },
        });
        return;
      }

      // Cards fan up into the stack, bottom card first, then a small "tap me" wiggle.
      const visible = orderRef.current.slice(0, 4).map((i) => cards[i]);
      introRef.current = gsap
        .timeline({ scrollTrigger: { trigger: deckRef.current, start: 'top 85%' } })
        .from(visible, {
          y: 160,
          opacity: 0,
          rotation: (i) => (i % 2 ? -1 : 1) * (8 + i * 4),
          duration: 1,
          ease: 'power3.out',
          stagger: { each: 0.12, from: 'end' },
        })
        .from(hintRef.current, { opacity: 0, y: 10, duration: 0.6, ease: 'power2.out' }, '-=0.45')
        .to(visible[0], { keyframes: { rotation: [0, -3.5, 2.5, -1.2, 0] }, duration: 0.9, ease: 'sine.inOut' }, '+=0.15');
    },
    { scope: rootRef }
  );

  const topCard = () => cardsRef.current[orderRef.current[0]];

  const finishIntro = () => {
    const intro = introRef.current;
    if (intro && intro.progress() < 1) intro.progress(1);
  };

  // Send the top card flying (dir -1 left, 1 right, 0 random) and tuck it under the deck.
  const advance = contextSafe((dir = 0) => {
    if (busyRef.current) return;
    finishIntro();
    busyRef.current = true;

    const cards = cardsRef.current;
    const leaving = topCard();
    const order = [...orderRef.current.slice(1), orderRef.current[0]];
    orderRef.current = order;
    setTop(order[0]);
    const unlock = () => {
      busyRef.current = false;
    };

    if (prefersReducedMotion()) {
      const tl = gsap.timeline({ onComplete: unlock }).to(leaving, { opacity: 0, duration: 0.25, ease: 'power1.out' });
      order.forEach((c, pos) => {
        const pose = slot(pos);
        tl.set(cards[c], { ...pose, zIndex: depth(pos), opacity: pos === 0 ? 0 : pose.opacity });
      });
      tl.to(cards[order[0]], { opacity: 1, duration: 0.35, ease: 'power1.out' });
      return;
    }

    const side = dir || (Math.random() < 0.5 ? -1 : 1);
    const tl = gsap.timeline({ onComplete: unlock, defaults: { overwrite: 'auto' } });

    tl.set(leaving, { zIndex: TOTAL + 1 }, 0).to(
      leaving,
      {
        x: side * window.innerWidth * 1.1,
        y: -gsap.utils.random(30, 90),
        rotation: side * gsap.utils.random(18, 25),
        duration: 0.45,
        ease: 'power2.in',
      },
      0
    );

    // Everyone else moves up one place.
    order.forEach((c, pos) => {
      const card = cards[c];
      if (card === leaving) return;
      const pose = slot(pos);
      tl.set(card, { zIndex: depth(pos) }, 0);
      if (pos <= 3) tl.to(card, { ...pose, duration: 0.5, ease: 'power3.out' }, 0.08 + pos * 0.035);
      else tl.set(card, pose, 0);
    });

    // The flown card returns to the bottom of the stack (invisible there unless the deck is tiny).
    const last = TOTAL - 1;
    const bottom = slot(last);
    tl.set(leaving, { zIndex: depth(last) }, 0.45);
    if (bottom.opacity > 0) tl.to(leaving, { ...bottom, duration: 0.5, ease: 'power3.out' }, 0.45);
    else tl.set(leaving, bottom, 0.45);
  });

  const settle = contextSafe(() => {
    gsap.to(topCard(), { x: 0, y: 0, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.6)', overwrite: 'auto' });
  });

  const onClick = () => {
    // A swipe also ends in a click on some devices; the swipe already handled it.
    if (performance.now() < quietUntil.current) return;
    advance();
  };

  // Bonus: swipe the top card sideways. Vertical gestures are left to the page scroll.
  const onPointerDown = (e) => {
    if (busyRef.current || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (prefersReducedMotion()) return;
    dragRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, moved: false };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      const dy = e.clientY - d.y0;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) || busyRef.current) {
        d.id = null;
        return;
      }
      d.moved = true;
      finishIntro();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }
    d.dx = dx;
    gsap.set(topCard(), { x: dx, y: -Math.abs(dx) * 0.04, rotation: dx * 0.06 });
  };

  const onPointerEnd = (e) => {
    const d = dragRef.current;
    if (d.id !== e.pointerId) return;
    d.id = null;
    if (!d.moved) return;
    quietUntil.current = performance.now() + 450;
    const width = deckRef.current?.offsetWidth || 320;
    if (e.type === 'pointerup' && Math.abs(d.dx) > Math.min(110, width * 0.3)) advance(Math.sign(d.dx));
    else settle();
  };

  return (
    <section className="cel-section cel-rsn" ref={rootRef} aria-labelledby="cel-rsn-title">
      <header className="cel-rsn-head">
        <p className="cel-kicker">a few of the many</p>
        <h2 id="cel-rsn-title" className="cel-h2">
          {birthday.reasonsTitle}
        </h2>
      </header>

      <div className="cel-rsn-stage">
        <button
          type="button"
          ref={deckRef}
          className="cel-rsn-deck"
          aria-label="Show the next reason"
          onClick={onClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {REASONS.map(({ text, photo }, i) => (
            <span
              key={i}
              className="cel-rsn-card"
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
            >
              <span className="cel-rsn-top">
                <span className="cel-rsn-num">{pad(i + 1)}</span>
                {photo ? (
                  <span className="cel-rsn-photo" aria-hidden="true">
                    <img src={photo} alt="" loading="lazy" decoding="async" draggable={false} />
                  </span>
                ) : null}
              </span>
              <span className="cel-rsn-text">{text}</span>
              <span className="cel-rsn-foot">
                <span className="cel-rsn-rule" />
                <svg className="cel-rsn-heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d={HEART} />
                </svg>
              </span>
            </span>
          ))}
        </button>
      </div>

      <p className="cel-rsn-hint" ref={hintRef} aria-hidden="true">
        tap the card <span className="cel-rsn-dot">·</span>{' '}
        <span className="cel-rsn-count">
          {pad(top + 1)} / {pad(TOTAL)}
        </span>
      </p>
      <p className="cel-rsn-sr" aria-live="polite">
        {`Reason ${top + 1} of ${TOTAL}: ${REASONS[top].text}`}
      </p>
    </section>
  );
}
