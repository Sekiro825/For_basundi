'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from './lib/gsap';
import { createMusicBox } from './lib/musicBox';
import { birthday } from './birthdayConfig';
import StarField from './components/StarField';
import SparkleTrail from './components/SparkleTrail';
import RosePetals from './components/RosePetals';
import Countdown from './scenes/Countdown';
import Envelope from './scenes/Envelope';
import Story from './scenes/Story';
import Cake from './scenes/Cake';
import Celebration from './scenes/Celebration';

const SCENES = ['countdown', 'envelope', 'story', 'cake', 'celebrate'];
const SCENE_LABELS = {
  countdown: 'Countdown',
  envelope: 'Envelope',
  story: 'Story',
  cake: 'Cake',
  celebrate: 'Celebration',
};
const MUTE_KEY = 'bd:muted';
const TRANSITION_MS = 3200;

// Before the birthday (and only when it's close) the surprise stays locked
// behind a countdown. On the day and afterwards it's simply open.
function getGate(now) {
  const year = now.getFullYear();
  const target = new Date(year, birthday.month - 1, birthday.day);
  if (now >= target) {
    return { open: true, target: new Date(year + 1, birthday.month - 1, birthday.day).getTime() };
  }
  const open = target - now > birthday.countdownWindowDays * 86400000;
  return { open, target: target.getTime() };
}

export default function BirthdayClient() {
  const [scene, setScene] = useState(null);
  const [target, setTarget] = useState(0);
  const [preview, setPreview] = useState(false);
  const [muted, setMuted] = useState(false);
  const [music] = useState(() => createMusicBox());
  const curtainRef = useRef(null);
  const transitionCtx = useRef(null);
  const busySince = useRef(0);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(MUTE_KEY) === '1') {
        setMuted(true);
        music.setMuted(true);
      }
    } catch {}

    // ?preview lets Saket peek before the day; ?preview&scene=cake jumps to a scene.
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.has('preview');
    const requested = isPreview ? params.get('scene') : null;
    const gate = getGate(new Date());
    setPreview(isPreview);
    setTarget(gate.target);
    setScene(SCENES.includes(requested) ? requested : gate.open ? 'envelope' : 'countdown');

    // Transitions get their own GSAP context. Without it, a transition started
    // from a scene's animation callback belongs to that scene, and is killed
    // halfway when the scene unmounts, which used to lock every later button.
    transitionCtx.current = gsap.context(() => {});
    return () => {
      transitionCtx.current?.revert();
      music.dispose();
    };
  }, [music]);

  // Iris transition: a velvet curtain closes from the centre, the scene swaps
  // underneath, then a hole opens outward to reveal it.
  const go = useCallback((next) => {
    const now = Date.now();
    if (now - busySince.current < TRANSITION_MS) return;
    busySince.current = now;
    const el = curtainRef.current;
    const heart = el.firstChild;
    const run = () => {
      gsap
        .timeline({ onComplete: () => (busySince.current = 0) })
        .set(el, { autoAlpha: 1, '--hole': '0%', clipPath: 'circle(0% at 50% 50%)' })
        .to(el, { clipPath: 'circle(75% at 50% 50%)', duration: 0.85, ease: 'power3.inOut' })
        .fromTo(heart, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' }, '-=0.3')
        .add(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          setScene(next);
        })
        .to(heart, { scale: 1.7, opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0.35')
        .to(el, { '--hole': '105%', duration: 1.05, ease: 'power3.inOut' }, '<0.1')
        .set(el, { autoAlpha: 0, '--hole': '0%', clipPath: 'circle(0% at 50% 50%)' });
    };
    if (transitionCtx.current) transitionCtx.current.add(run);
    else run();
  }, []);

  const toEnvelope = useCallback(() => go('envelope'), [go]);
  const toStory = useCallback(() => go('story'), [go]);
  const toCake = useCallback(() => go('cake'), [go]);
  const toCelebrate = useCallback(() => go('celebrate'), [go]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    music.setMuted(next);
    try {
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    } catch {}
  };

  const showMusic = scene === 'story' || scene === 'cake' || scene === 'celebrate';
  const showPetals = scene === 'countdown' || scene === 'envelope' || scene === 'celebrate';

  return (
    <div className="bd-root" data-scene={scene || 'boot'}>
      <StarField />
      {showPetals && <RosePetals density={scene === 'celebrate' ? 0.8 : 1} />}

      {!scene && <div className="bd-boot" aria-hidden="true">🌸</div>}
      {scene === 'countdown' && <Countdown target={target} preview={preview} onOpen={toEnvelope} />}
      {scene === 'envelope' && <Envelope music={music} onOpened={toStory} />}
      {scene === 'story' && <Story music={music} onDone={toCake} />}
      {scene === 'cake' && <Cake music={music} onDone={toCelebrate} />}
      {scene === 'celebrate' && <Celebration music={music} onReplay={toEnvelope} />}

      {showMusic && (
        <button
          type="button"
          className="bd-music"
          onClick={toggleMute}
          aria-label={muted ? 'Play music' : 'Mute music'}
          aria-pressed={!muted}
          title={muted ? 'Play music' : 'Mute music'}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M17 9l4 6M21 9l-4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <span className="bd-eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
        </button>
      )}

      {/* Test-run helper: only with ?preview (the sidebar's 🧪 link for Saket). */}
      {preview && scene && (
        <details className="bd-preview">
          <summary>🧪 Jump to…</summary>
          <div className="bd-preview-list">
            {SCENES.map((s) => (
              <button
                key={s}
                type="button"
                className="bd-preview-btn"
                aria-pressed={scene === s}
                onClick={(e) => {
                  e.currentTarget.closest('details').open = false;
                  if (s !== scene) go(s);
                }}
              >
                {SCENE_LABELS[s]}
              </button>
            ))}
          </div>
        </details>
      )}

      <SparkleTrail />
      <div className="bd-curtain" ref={curtainRef} aria-hidden="true">
        <span className="bd-curtain-heart">🌸</span>
      </div>
    </div>
  );
}
