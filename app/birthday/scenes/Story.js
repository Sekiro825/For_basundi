// Adapted from faahim/happy-birthday (MIT © 2024 faahim), see LICENSES.md
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { birthday } from '../birthdayConfig';
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '../lib/gsap';
import { buildSong } from '../lib/musicBox';
import { heartBurst, PALETTE } from '../lib/confetti';
import Rose from '../components/Rose';
import './story.css';

// Balloon tones: [highlight, body, shade].
const TONES = [
  { light: '#ffd0e0', base: '#f48fb1', dark: '#c2557f' }, // rose
  { light: '#fff6f9', base: '#ffd6e4', dark: '#e29bb6' }, // blush
  { light: '#fff0c4', base: '#e8c26e', dark: '#a97a26' }, // gold
  { light: '#ffece0', base: '#ffc6a6', dark: '#ec9b76' }, // peach
  { light: '#ebe2fa', base: '#b39ddb', dark: '#7b62b3' }, // lavender
  { light: '#ffffff', base: '#fff4e6', dark: '#dcc3a2' }, // cream
];

// Deterministic PRNG (mulberry32), so server and client render identical
// balloons and the render stays pure.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BALLOONS = (() => {
  const r = seeded(930);
  return Array.from({ length: 26 }, (_, i) => {
    const size = Math.round(48 + r() * 48);
    return {
      // Golden-ratio spacing keeps any prefix (16 on phones, 8 when reduced) well spread.
      left: Math.round((((i * 0.618034) % 1) * 86 + r() * 6) * 10) / 10,
      size,
      tone: (i + Math.floor(r() * 3)) % TONES.length,
      dur: 2.5 + r(),
      sway: 10 + r() * 26,
      tilt: 4 + r() * 8,
      z: size > 72 ? 2 : 1,
      alpha: size < 60 ? 0.82 : 1,
    };
  });
})();

const BURSTS = [
  ['14%', '20%'],
  ['86%', '16%'],
  ['50%', '8%'],
  ['8%', '58%'],
  ['92%', '62%'],
  ['28%', '88%'],
  ['72%', '86%'],
  ['36%', '38%'],
  ['64%', '44%'],
].map(([x, y], i) => ({ x, y, c: PALETTE[i % PALETTE.length] }));

// Ruffle points along the hat's curved brim (quadratic 14,104 → 50,118 → 86,104).
const HAT_TRIM = Array.from({ length: 9 }, (_, i) => {
  const t = i / 8;
  return { x: 14 + 72 * t, y: 104 + 28 * t * (1 - t) };
});

function Balloon({ id, tone }) {
  return (
    <svg viewBox="0 0 60 132" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={id} cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor={tone.light} />
          <stop offset="50%" stopColor={tone.base} />
          <stop offset="100%" stopColor={tone.dark} />
        </radialGradient>
      </defs>
      <path
        d="M30 76 c -6 7, 6 11, 0 18 s -6 11, 0 18 s 6 11, 0 18"
        fill="none"
        stroke="rgba(253,241,245,.55)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path d="M30 2 C13 2 2 16 2 34 C2 52 15 66 27 71 L33 71 C45 66 58 52 58 34 C58 16 47 2 30 2 Z" fill={`url(#${id})`} />
      <path d="M26.5 76 L30 70.5 L33.5 76 Q30 77.6 26.5 76 Z" fill={tone.dark} />
      <ellipse cx="19" cy="21" rx="5.5" ry="10.5" transform="rotate(-28 19 21)" fill="#fff" opacity=".55" />
      <circle cx="22" cy="38" r="1.8" fill="#fff" opacity=".35" />
    </svg>
  );
}

function PartyHat() {
  return (
    <svg viewBox="0 0 100 124" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="st-hat-clip">
          <path d="M50 16 L86 104 Q50 118 14 104 Z" />
        </clipPath>
        <linearGradient id="st-hat-shade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".3" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#2a0e25" stopOpacity=".4" />
        </linearGradient>
      </defs>
      <g clipPath="url(#st-hat-clip)">
        <rect x="0" y="0" width="100" height="124" fill="#f48fb1" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x="-30" y={8 + i * 17} width="160" height="7" fill="#e8c26e" transform="rotate(-24 50 60)" />
        ))}
        <rect x="0" y="0" width="100" height="124" fill="url(#st-hat-shade)" />
      </g>
      {HAT_TRIM.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5.6" fill={i % 2 ? '#ffd6e4' : '#fff4e6'} />
      ))}
      <circle cx="50" cy="13" r="8.5" fill="#fff4e6" />
      <circle cx="43.5" cy="10" r="5" fill="#fff4e6" />
      <circle cx="56.5" cy="9.5" r="5" fill="#ffd6e4" />
      <circle cx="50" cy="5" r="5" fill="#fff" />
      <circle cx="44.5" cy="17" r="4.6" fill="#ffd6e4" />
      <circle cx="55.5" cy="17" r="4.6" fill="#fff4e6" />
      <circle cx="47" cy="9" r="2.2" fill="#fff" opacity=".9" />
    </svg>
  );
}

// Sum offsets up to `container` (which must be positioned).
function offsetWithin(el, container) {
  let x = 0;
  let y = 0;
  let node = el;
  while (node && node !== container) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return { x, y };
}

export default function Story({ music, onDone }) {
  const s = birthday.story;
  const rootRef = useRef(null);
  const doneRef = useRef(false);
  const autoRef = useRef(null);
  const onDoneRef = useRef(onDone);
  const musicRef = useRef(music);

  useEffect(() => {
    onDoneRef.current = onDone;
    musicRef.current = music;
  });

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimeout(autoRef.current);
    onDoneRef.current?.();
  }, []);

  // Soft music box in the background. The next scene decides when it stops.
  useEffect(() => {
    music?.play?.({ song: buildSong(birthday.nameSyllables), tempo: 84, gain: 0.45, loop: true, gap: 2.5 });
  }, []);

  useEffect(() => () => clearTimeout(autoRef.current), []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const q = gsap.utils.selector(root);
      const reduce = prefersReducedMotion();
      const balloonCount = reduce ? 8 : window.innerWidth < 600 ? 16 : BALLOONS.length;

      const ideaIn = { opacity: 0, y: -20, rotationX: 5, skewX: '15deg' };
      const ideaOut = { opacity: 0, y: 20, rotationY: 5, skewX: '-15deg' };

      const title = SplitText.create(q('.st-title'), {
        type: 'words,chars',
        mask: 'chars',
        wordsClass: 'st-word',
        charsClass: 'st-char',
      });
      const three = SplitText.create(q('.st-three-text'), { type: 'words', wordsClass: 'st-word' });
      const chat = SplitText.create(q('.st-field-text'), { type: 'words,chars', wordsClass: 'st-word', charsClass: 'st-tchar' });
      const wish = SplitText.create(q('.st-wish-title'), { type: 'words,chars', wordsClass: 'st-word', charsClass: 'st-wchar' });

      const [stage] = q('.st-stage');
      const [card] = q('.st-card');
      const [field] = q('.st-field');
      const [caret] = q('.st-caret');
      const [send] = q('.st-send');
      const [bubble] = q('.st-bubble');
      const [idea1, idea2, idea3, idea4, idea5] = q('.st-idea');
      const [strong] = q('.st-strong');
      const bigLetters = q('.st-big-letter');
      const [six] = q('.st-six');
      const [dp] = q('.st-dp');
      const [hat] = q('.st-hat');

      const placeCaret = (el, before) => {
        if (!el || !caret || !field) return;
        const { x, y } = offsetWithin(el, field);
        gsap.set(caret, { x: before ? x : x + el.offsetWidth, y });
      };

      const tl = gsap.timeline({ delay: 0.4 });

      // 1. "Hey {name}" rises out of masks, then the greeting line.
      tl.from(title.chars, { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.04 })
        .from('.st-one-text', { opacity: 0, y: 10, duration: 0.7 }, '-=0.45')
        .to('.st-title', { opacity: 0, y: 10, duration: 0.7 }, '+=2.5')
        .to('.st-one-text', { opacity: 0, y: 10, duration: 0.7 }, '-=1');

      // Static 3D setup (set once, never tweened).
      gsap.set(three.words, { transformPerspective: 600, transformOrigin: '50% 100%' });
      gsap.set(wish.chars, { transformPerspective: 500 });

      // 2. It's your birthday.
      tl.from(three.words, {
        opacity: 0,
        y: 24,
        rotationX: -70,
        duration: 0.8,
        ease: 'back.out(1.6)',
        stagger: 0.08,
      }).to('.st-three-text', { opacity: 0, y: 10, duration: 0.7 }, '+=2');

      // 3. The message she almost got.
      tl.from(card, { scale: 0.2, opacity: 0, duration: 0.7, ease: 'back.out(1.4)' })
        .call(() => placeCaret(chat.chars[0], true), null, '<')
        .from(send, { scale: 0.2, opacity: 0, duration: 0.3, ease: 'back.out(2)' })
        .fromTo(
          chat.chars,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.08,
            ease: 'none',
            stagger: {
              each: 0.05,
              onStart() {
                placeCaret(this.targets()[0]);
              },
            },
          },
          '+=0.2'
        )
        .to(send, { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '+=0.35')
        .to(send, {
          backgroundColor: '#f48fb1',
          borderColor: '#f48fb1',
          color: '#2a0e25',
          boxShadow: '0 0 26px rgba(244, 143, 177, 0.65)',
          duration: 0.12,
        })
        .fromTo(bubble, { autoAlpha: 0, scale: 0.4, y: 10 }, { autoAlpha: 1, scale: 1, y: -18, duration: 0.4, ease: 'back.out(2.2)' }, '<')
        .to(chat.chars, { autoAlpha: 0, duration: 0.15, stagger: { each: 0.003, from: 'end' } }, '<')
        .call(() => placeCaret(chat.chars[0], true))
        .to(bubble, { y: -170, autoAlpha: 0, duration: 1, ease: 'power2.in' }, '+=0.2')
        .to(card, { scale: 0.2, opacity: 0, y: -150, duration: 0.5 }, '<0.5');

      // 4. The ideas.
      tl.from(idea1, { ...ideaIn, duration: 0.7 })
        .to(idea1, { ...ideaOut, duration: 0.7 }, '+=1.5')
        .from(idea2, { ...ideaIn, duration: 0.7 })
        .to(idea2, { ...ideaOut, duration: 0.7 }, '+=1.5')
        .from(idea3, { ...ideaIn, duration: 0.7 })
        .to(strong, {
          scale: 1.2,
          x: 10,
          backgroundColor: '#e8c26e',
          color: '#2a0e25',
          boxShadow: '0 0 28px rgba(232, 194, 110, 0.55)',
          duration: 0.5,
        })
        // keep the full stop clear of the grown pill
        .to('.st-period', { x: () => strong.offsetWidth * 0.1 + 10, duration: 0.5 }, '<')
        .to(idea3, { ...ideaOut, duration: 0.7 }, '+=1.5')
        .from(idea4, { ...ideaIn, duration: 0.7 })
        .to(idea4, { ...ideaOut, duration: 0.7 }, '+=1.5')
        .from(idea5, { rotationX: 15, rotationZ: -10, skewY: '-5deg', y: 50, z: 10, opacity: 0, duration: 0.7 }, '+=0.5')
        .to('.st-smiley', { rotation: 90, x: 8, duration: 0.7 }, '+=0.4')
        .to(idea5, { scale: 0.2, opacity: 0, duration: 0.7 }, '+=2')
        .from(bigLetters, { scale: 3, opacity: 0, rotation: 15, ease: 'expo.out', duration: 0.8, stagger: 0.2 })
        .to(bigLetters, { scale: 3, opacity: 0, rotation: -15, ease: 'expo.out', duration: 0.8, stagger: 0.2 }, '+=1');

      // 5. Balloons, each with its own pace and sway.
      const balloonStart = tl.duration();
      q('.st-balloon')
        .slice(0, balloonCount)
        .forEach((el, i) => {
          const b = BALLOONS[i];
          const at = balloonStart + i * 0.2;
          tl.fromTo(
            el,
            { y: 0, autoAlpha: 0.9 },
            { y: () => -(root.clientHeight + el.offsetHeight + 60), autoAlpha: 1, duration: b.dur, ease: 'sine.in' },
            at
          ).fromTo(
            el.firstElementChild,
            { x: -b.sway, rotation: -b.tilt },
            { x: b.sway, rotation: b.tilt, duration: b.dur / 3, repeat: 2, yoyo: true, ease: 'sine.inOut' },
            at
          );
        });

      // 6. Her portrait, the party hat, and the wish.
      tl.from(dp, { scale: 3.5, opacity: 0, x: 25, y: -25, rotationZ: -45, duration: 0.5 }, '-=2')
        .fromTo(
          hat,
          { x: -100, y: 350, rotation: -180, opacity: 0 },
          { x: 0, y: 0, rotation: -22, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }
        )
        .from(wish.chars, {
          opacity: 0,
          y: -50,
          rotation: 150,
          skewX: '30deg',
          ease: 'elastic.out(1, 0.5)',
          duration: 0.7,
          stagger: 0.1,
        })
        .addLabel('party')
        .fromTo(
          wish.chars,
          { scale: 1.4, rotationY: 150 },
          { scale: 1, rotationY: 0, color: '#f48fb1', ease: 'expo.out', duration: 0.7, stagger: 0.1 },
          'party'
        )
        .from('.st-wish-text', { opacity: 0, y: 10, skewX: '-15deg', duration: 0.5 }, 'party')
        .call(
          () => {
            musicRef.current?.sparkle?.();
            heartBurst(0.5, 0.35);
          },
          null,
          'party'
        );

      // 7. Burst circles (skipped for reduced motion; a quiet hold instead).
      if (!reduce) {
        tl.fromTo(
          '.st-burst',
          { scale: 0, autoAlpha: 0.6 },
          { scale: 60, autoAlpha: 0, duration: 1.5, ease: 'power1.out', stagger: { each: 0.3, repeat: 2, repeatDelay: 0.8 } }
        );
      } else {
        tl.to({}, { duration: 3 });
      }

      // 8. Outro and the way to the cake.
      tl.to(six, { opacity: 0, y: 30, duration: 0.5 })
        .from('.st-nine > *', { autoAlpha: 0, y: -20, rotationX: 5, skewX: '15deg', duration: 1, stagger: 1.2 })
        .call(() => {
          clearTimeout(autoRef.current);
          autoRef.current = setTimeout(finish, 12000);
        });

      // Everything is now hidden by its opening tween, so the stage can show.
      gsap.set(stage, { visibility: 'visible' });
    },
    { scope: rootRef }
  );

  return (
    <section ref={rootRef} className="bd-scene st-root">
      <div className="st-stage">
        <div className="st-bursts" aria-hidden="true">
          {BURSTS.map((b, i) => (
            <span key={i} className="st-burst" style={{ left: b.x, top: b.y, '--st-c': b.c }} />
          ))}
        </div>

        <div className="st-group st-one">
          <h1 className="st-title">
            <span className="st-greet">{s.greeting}</span> <span className="st-name">{birthday.name}</span>
          </h1>
          <p className="st-one-text">{s.greetingText}</p>
        </div>

        <div className="st-group st-three">
          <p className="st-three-text">{s.itsYourBirthday}</p>
        </div>

        <div className="st-group st-four">
          <div className="st-card-wrap">
            <div className="st-card">
              <div className="st-card-head">
                <span className="st-card-avatar">
                  {birthday.portrait ? (
                    <img src={birthday.portrait} alt="" />
                  ) : (
                    <span className="st-card-initial">{birthday.name[0]}</span>
                  )}
                </span>
                <span className="st-card-name">{birthday.name}</span>
                <span className="st-card-dot" aria-hidden="true" />
              </div>
              <div className="st-compose">
                <div className="st-field">
                  <p className="st-field-text">{s.chat}</p>
                  <span className="st-caret" aria-hidden="true" />
                </div>
                <span className="st-send">
                  {s.sendLabel}
                  <svg className="st-send-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M3 11.5 20.5 4l-7.5 17.5-2.2-7.8L3 11.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="st-bubble" aria-hidden="true">
              {s.chat}
            </div>
          </div>
        </div>

        <div className="st-group st-five">
          <p className="st-idea">{s.idea1}</p>
          <p className="st-idea">{s.idea2}</p>
          <p className="st-idea">
            {s.idea3}{' '}
            <span className="st-nowrap">
              <strong className="st-strong">{s.idea3Strong}</strong>
              <span className="st-period">.</span>
            </span>
          </p>
          <p className="st-idea st-idea4">{s.idea4}</p>
          <p className="st-idea st-idea5">
            {s.idea5}
            <span className="st-smiley">:)</span>
          </p>
          <p className="st-idea st-big" aria-label={s.bigText.join('')}>
            {s.bigText.map((letter, i) => (
              <span key={i} className="st-big-letter" aria-hidden="true">
                {letter}
              </span>
            ))}
          </p>
        </div>

        <div className="st-balloons" aria-hidden="true">
          {BALLOONS.map((b, i) => (
            <div key={i} className="st-balloon" style={{ left: `${b.left}%`, width: b.size, zIndex: b.z }}>
              <div className="st-balloon-inner" style={{ opacity: b.alpha }}>
                <Balloon id={`st-balloon-grad-${i}`} tone={TONES[b.tone]} />
              </div>
            </div>
          ))}
        </div>

        <div className="st-group st-six">
          <div className="st-portrait">
            <div className="st-dp">
              <span className="st-dp-ring" aria-hidden="true" />
              <div className={`st-dp-frame${birthday.portrait ? '' : ' st-dp-frame-rose'}`}>
                {birthday.portrait ? (
                  <img src={birthday.portrait} alt={birthday.name} />
                ) : (
                  <Rose tone="pink" className="st-dp-rose" />
                )}
              </div>
            </div>
            <div className="st-hat" aria-hidden="true">
              <PartyHat />
            </div>
          </div>
          <div className="st-wish">
            <h2 className="st-wish-title">{s.wishHeading}</h2>
            <h5 className="st-wish-text">{s.wishText}</h5>
          </div>
        </div>

        <div className="st-group st-nine">
          <p className="st-outro">{s.outro}</p>
          {/* wrapper takes the tween, so .bd-btn transitions never fight GSAP */}
          <div className="st-outro-cta">
            <button type="button" className="bd-btn st-outro-btn" onClick={finish}>
              {s.outroButton}
            </button>
          </div>
        </div>
      </div>

      <button type="button" className="bd-skip" onClick={finish} aria-label="Skip this part">
        skip ⏭
      </button>
    </section>
  );
}
