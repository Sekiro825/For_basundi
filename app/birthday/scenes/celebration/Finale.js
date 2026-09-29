'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '../../lib/gsap';
import { heartBurst } from '../../lib/confetti';
import { birthday } from '../../birthdayConfig';
import Bouquet from '../../components/Bouquet';
import { bloomRose } from '../../components/Rose';
import './celebration-b.css';

const { finale } = birthday;
const MAX_LANTERNS = 40;
const SPARKS = 6;

// Lanterns are plain DOM nodes inside the fixed layer; each removes itself when it's gone.
function buildLantern(text, small) {
  const el = document.createElement('div');
  el.className = small ? 'cel-fin-lantern is-small' : 'cel-fin-lantern';
  const sway = document.createElement('div');
  sway.className = 'cel-fin-lantern-sway';
  const body = document.createElement('div');
  body.className = 'cel-fin-lantern-body';
  if (text) {
    const words = document.createElement('span');
    words.className = 'cel-fin-lantern-text';
    words.textContent = text;
    body.appendChild(words);
  }
  const flame = document.createElement('span');
  flame.className = 'cel-fin-lantern-flame';
  sway.append(body, flame);
  el.appendChild(sway);
  return el;
}

export default function Finale({ music, onReplay }) {
  const rootRef = useRef(null);
  const layerRef = useRef(null);
  const fieldRef = useRef(null);
  const inputRef = useRef(null);
  const doneRef = useRef(null);
  const [wish, setWish] = useState('');
  const [released, setReleased] = useState(0);
  const inputId = useId();

  // The sky layer sits directly in .bd-root (outside any transformed ancestor), so
  // position:fixed really covers the viewport and z-index 40 lines up with the page's scale.
  useEffect(() => {
    const root = rootRef.current;
    const host = root?.closest('.bd-root') || document.body;
    const layer = document.createElement('div');
    layer.className = 'cel-fin-lanterns';
    layer.setAttribute('aria-hidden', 'true');
    const hand = root ? getComputedStyle(root).getPropertyValue('--bd-hand').trim() : '';
    if (hand) layer.style.setProperty('--bd-hand', hand);
    host.appendChild(layer);
    layerRef.current = layer;
    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, []);

  const { contextSafe } = useGSAP(
    () => {
      const root = rootRef.current;
      const q = (s) => root.querySelector(s);
      const portrait = q('.cel-fin-portrait');
      const title = q('.cel-fin-title');
      const form = q('.cel-fin-wish');
      const rest = root.querySelectorAll('.cel-fin-wish, .cel-fin-actions, .cel-fin-footer');

      if (prefersReducedMotion()) {
        gsap.from([portrait, title], {
          opacity: 0,
          duration: 1,
          stagger: 0.25,
          ease: 'power1.out',
          scrollTrigger: { trigger: portrait, start: 'top 85%' },
        });
        gsap.from(rest, {
          opacity: 0,
          duration: 0.9,
          stagger: 0.15,
          ease: 'power1.out',
          scrollTrigger: { trigger: form, start: 'top 92%' },
        });
        return;
      }

      gsap.from(portrait, {
        y: 50,
        scale: 0.88,
        opacity: 0,
        duration: 1.4,
        ease: 'power3.out',
        scrollTrigger: { trigger: portrait, start: 'top 85%' },
      });

      // The bouquet's roses unfurl one by one, then it sways gently.
      const bloom = gsap.timeline({
        scrollTrigger: { trigger: portrait, start: 'top 80%' },
      });
      bloom
        .from(root.querySelectorAll('.bq-leaf'), { scale: 0, opacity: 0, transformOrigin: '0% 50%', duration: 0.8, ease: 'back.out(1.6)', stagger: 0.06 })
        .from(root.querySelectorAll('.bq-ribbon'), { scale: 0, rotation: -30, transformOrigin: '50% 50%', duration: 0.8, ease: 'back.out(2)' }, 0.2)
        .from(root.querySelectorAll('.bq-breath circle'), { scale: 0, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.03, ease: 'back.out(3)' }, 0.6);
      root.querySelectorAll('.bq-rose .rose').forEach((svg, i) => bloom.add(bloomRose(svg, { duration: 1.2 }), 0.25 + i * 0.18));
      gsap.to(root.querySelector('.cel-fin-bouquet'), {
        rotation: 1.6,
        transformOrigin: '50% 95%',
        duration: 3.2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });

      const split = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'cel-fin-word' });
      gsap.from(split.words, {
        yPercent: 115,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.09,
        scrollTrigger: { trigger: title, start: 'top 86%' },
        // Unwrap afterwards so the heading's glow isn't cropped by the word masks.
        onComplete: () => split.revert(),
      });

      gsap.from(rest, {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.14,
        scrollTrigger: { trigger: form, start: 'top 92%' },
      });
    },
    { scope: rootRef }
  );

  // Float one lantern up from (x, y) — viewport px, where its bottom edge starts.
  const launch = contextSafe((x, y, text, { small = false, delay = 0 } = {}) => {
    const layer = layerRef.current;
    if (!layer || layer.childElementCount >= MAX_LANTERNS) return;
    const el = buildLantern(text, small);
    layer.appendChild(el);
    const sway = el.firstChild;
    gsap.set(el, { x, y, xPercent: -50, yPercent: -100, transformOrigin: '50% 100%' });

    if (prefersReducedMotion()) {
      gsap
        .timeline({ delay, onComplete: () => el.remove() })
        .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power1.out' })
        .to(el, { y: y - 50, duration: 4.5, ease: 'sine.inOut' }, 0)
        .to(el, { opacity: 0, duration: 1.4, ease: 'power1.in' }, 3.1);
      return;
    }

    const duration = small ? gsap.utils.random(8, 11) : 9;
    const amp = small ? gsap.utils.random(6, 12) : gsap.utils.random(10, 16);
    const vw = window.innerWidth;
    const swayTween = gsap.fromTo(
      sway,
      { x: -amp, rotation: -amp * 0.35 },
      {
        x: amp,
        rotation: amp * 0.35,
        duration: gsap.utils.random(1.8, 2.6),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay,
      }
    );

    gsap
      .timeline({
        delay,
        onComplete: () => {
          swayTween.kill();
          el.remove();
        },
      })
      .fromTo(el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, 0)
      .to(el, { y: -80, duration, ease: 'power1.in' }, 0.1)
      .to(el, { x: gsap.utils.clamp(24, vw - 24, x + gsap.utils.random(-60, 60)), duration, ease: 'sine.inOut' }, 0.1)
      .to(el, { scale: 0.45, duration: duration - 0.8, ease: 'sine.in' }, 0.9)
      .to(el, { opacity: 0, duration: 2, ease: 'power1.in' }, duration - 1.9);
  });

  const onSubmit = contextSafe((e) => {
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = fieldRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : vw / 2;
    const y = rect ? rect.top : vh * 0.7;

    launch(x, y, wish.trim());
    const companions = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < companions; i++) {
      const side = i % 2 ? 1 : -1;
      const spread = gsap.utils.random(50, Math.max(60, Math.min(240, vw * 0.42)));
      launch(gsap.utils.clamp(24, vw - 24, x + side * spread), y + gsap.utils.random(-40, 80), '', {
        small: true,
        delay: gsap.utils.random(0.3, 1.8),
      });
    }

    music?.sparkle();
    heartBurst(gsap.utils.clamp(0.05, 0.95, x / vw), gsap.utils.clamp(0.1, 0.9, y / vh), 30);

    setWish('');
    setReleased((n) => n + 1);
    // Drop the on-screen keyboard so she can watch it rise.
    if (window.matchMedia('(pointer: coarse)').matches) inputRef.current?.blur();
    if (doneRef.current) {
      gsap.fromTo(doneRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.35, ease: 'power2.out' });
    }
  });

  return (
    <section className="cel-section cel-fin" ref={rootRef} aria-labelledby="cel-fin-title">
      <figure className="cel-fin-portrait">
        <span className="cel-fin-glow" aria-hidden="true" />
        <Bouquet className="cel-fin-bouquet" />
        <span className="cel-fin-sparks" aria-hidden="true">
          {Array.from({ length: SPARKS }, (_, i) => (
            <span key={i}>✦</span>
          ))}
        </span>
        <figcaption className="cel-fin-caption">{finale.bouquetCaption}</figcaption>
      </figure>

      <h2 id="cel-fin-title" className="cel-h2 cel-fin-title">
        {finale.title}
      </h2>

      <form className="cel-fin-wish" onSubmit={onSubmit}>
        <label className="cel-fin-label" htmlFor={inputId}>
          {finale.wishPrompt}
        </label>
        <div className="cel-fin-field" ref={fieldRef}>
          <input
            ref={inputRef}
            id={inputId}
            className="cel-fin-input"
            type="text"
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            placeholder={finale.wishPlaceholder}
            maxLength={80}
            autoComplete="off"
            enterKeyHint="send"
          />
          <button type="submit" className="bd-btn cel-fin-send">
            {finale.wishButton} <span aria-hidden="true">🏮</span>
          </button>
        </div>
        <p className="cel-fin-done" ref={doneRef} aria-live="polite">
          {released > 0 ? finale.wishDone : ''}
        </p>
      </form>

      <div className="cel-fin-actions">
        <button type="button" className="bd-btn" onClick={() => onReplay?.()}>
          <span aria-hidden="true">↺</span> {finale.replay}
        </button>
      </div>

      {finale.photo?.src ? (
        <figure className="cel-fin-us">
          <img src={finale.photo.src} alt={finale.photo.alt || ''} loading="lazy" decoding="async" />
        </figure>
      ) : null}

      <footer className="cel-fin-footer">
        made with all my love, for {birthday.name} · {birthday.from}
      </footer>
    </section>
  );
}
