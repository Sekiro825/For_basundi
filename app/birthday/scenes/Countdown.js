'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '../lib/gsap';
import { birthday } from '../birthdayConfig';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// A single digit that rolls (odometer-style) whenever it changes.
function RollDigit({ value }) {
  const ref = useRef(null);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const [outgoing, incoming] = ref.current.children;
    outgoing.textContent = prev.current;
    prev.current = value;
    gsap.fromTo(outgoing, { yPercent: 0, opacity: 1 }, { yPercent: -100, opacity: 0, duration: 0.55, ease: 'power3.inOut' });
    gsap.fromTo(incoming, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.inOut' });
  }, [value]);

  return (
    <span className="bd-digit" ref={ref}>
      <span aria-hidden="true" />
      <span>{value}</span>
    </span>
  );
}

function split(ms) {
  const s = Math.floor(ms / 1000);
  return [
    ['days', Math.floor(s / 86400)],
    ['hours', Math.floor(s / 3600) % 24],
    ['minutes', Math.floor(s / 60) % 60],
    ['seconds', s % 60],
  ];
}

export default function Countdown({ target, preview, onOpen }) {
  const root = useRef(null);
  const opened = useRef(false);
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const ms = target - Date.now();
      if (ms > 0) {
        setLeft(ms);
        return;
      }
      clearInterval(id);
      setLeft(0);
      if (!opened.current) {
        opened.current = true;
        onOpen();
      }
    }, 250);
    return () => clearInterval(id);
  }, [target, onOpen]);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.cel-kicker', { opacity: 0, y: 12, duration: 0.8 })
        .from('.bd-cd-name', { opacity: 0, scale: 0.9, filter: 'blur(14px)', duration: 1.5 }, '-=0.4')
        .from('.bd-cd-unit', { opacity: 0, y: 30, rotateX: -50, transformPerspective: 600, stagger: 0.1, duration: 0.9 }, '-=0.9')
        .from(['.bd-cd-when', '.bd-cd-hint', '.bd-cd-preview'], { opacity: 0, y: 12, stagger: 0.15, duration: 0.8 }, '-=0.4');
    },
    { scope: root }
  );

  const openNow = () => {
    if (opened.current) return;
    opened.current = true;
    onOpen();
  };

  return (
    <section className="bd-scene bd-countdown" ref={root} aria-live="polite">
      <div className="bd-cd-inner">
        <span className="cel-kicker">something is waiting for</span>
        <h1 className="bd-cd-name">{birthday.name}</h1>
        <div className="bd-cd-clock" role="timer" aria-label="Time until the surprise opens">
          {split(left).map(([label, n]) => (
            <div className="bd-cd-unit" key={label}>
              <span className="bd-cd-digits">
                {String(n).padStart(2, '0').split('').map((d, i) => (
                  <RollDigit key={i} value={d} />
                ))}
              </span>
              <span className="bd-cd-label">{label}</span>
            </div>
          ))}
        </div>
        <p className="bd-cd-when">
          opens at midnight · {birthday.day} {MONTHS[birthday.month - 1]}
        </p>
        <p className="bd-cd-hint">psst… bring your breath, you&apos;ll need it 🌬️</p>
        {preview && (
          <button type="button" className="bd-btn-ghost bd-cd-preview" onClick={openNow}>
            Preview it now (only visible with ?preview)
          </button>
        )}
      </div>
    </section>
  );
}
