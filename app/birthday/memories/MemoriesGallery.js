'use client';

/* eslint-disable @next/next/no-img-element -- media comes from an auth-checked route handler; plain <img> on purpose */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gallery } from '../galleryData';
import './memories.css';

const HER = 'Parshvi';
const ME = 'Saket';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

// Deterministic "scattered on the table" tilts, in degrees.
const TILTS = [-2.4, 1.8, -1.2, 2.6, -1.9, 1.1, -2.8, 0.9, 2.1, -1.5, 1.4, -0.8];

const word = (n) => WORDS[n] || String(n);
const plural = (n, one, many) => (n === 1 ? one : many);

function dateParts(iso) {
  const [, m, d] = String(iso || '').split('-').map(Number);
  return { month: MONTHS[m - 1] || '', day: d || 0 };
}

function dayMonth(iso) {
  const { month, day } = dateParts(iso);
  return month && day ? `${day} ${month}` : '';
}

const joinBits = (...bits) => bits.filter(Boolean).join(', ');
const list = (x) => (Array.isArray(x) ? x.filter(Boolean) : []);

function prefersReduced() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// ---------- Data, shaped once at module load ----------

function buildAlbum(g) {
  const us = [];
  const chapters = list(g?.chapters)
    .map((ch, c) => {
      const photos = list(ch.photos);
      const start = us.length;
      photos.forEach((photo, i) => {
        const date = photo.date || ch.date;
        us.push({
          photo,
          date,
          caption: ch.title,
          alt: joinBits(`${HER} and ${ME}`, dayMonth(date)),
          label: `Open photo ${i + 1} of ${photos.length} from ${ch.title}`,
        });
      });
      return { key: `${ch.date}-${c}`, title: ch.title, note: ch.note, date: ch.date, start, count: photos.length };
    })
    .filter((ch) => ch.count > 0);

  const her = list(g?.her).map((photo, i, arr) => ({
    photo,
    date: photo.date,
    caption: 'Just you',
    alt: joinBits(HER, dayMonth(photo.date)),
    label: `Open photo ${i + 1} of ${arr.length} of ${HER}`,
  }));

  const calls = list(g?.calls).map((photo, i, arr) => ({
    photo,
    date: photo.date,
    caption: 'On call with you',
    alt: joinBits(`Video call with ${HER}`, dayMonth(photo.date)),
    label: `Open call screenshot ${i + 1} of ${arr.length}`,
  }));

  return { chapters, sets: { us, her, calls }, clips: list(g?.clips) };
}

const ALBUM = buildAlbum(gallery);

// Call screenshots share one phone-shaped frame: the median aspect of the set.
const CALL_AR = (() => {
  const r = ALBUM.sets.calls
    .map(({ photo }) => photo.w / photo.h)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  return (r.length ? r[Math.floor(r.length / 2)] : 9 / 19.5).toFixed(4);
})();

const SECTIONS = [
  { id: 'mg-us', label: 'Us', count: ALBUM.sets.us.length },
  { id: 'mg-you', label: 'You', count: ALBUM.sets.her.length },
  { id: 'mg-calls', label: 'On call', count: ALBUM.sets.calls.length },
  { id: 'mg-clips', label: 'Clips', count: ALBUM.clips.length },
].filter((s) => s.count > 0);

const COUNTS = [
  ALBUM.sets.us.length && `${ALBUM.sets.us.length} of us`,
  ALBUM.sets.her.length && `${ALBUM.sets.her.length} of you`,
  ALBUM.sets.calls.length && `${ALBUM.sets.calls.length} on call`,
  ALBUM.clips.length && `${ALBUM.clips.length} ${plural(ALBUM.clips.length, 'little clip', 'little clips')}`,
]
  .filter(Boolean)
  .join(' · ');

// ---------- Small shared bits ----------

function markBroken(e) {
  e.currentTarget.dataset.broken = '1';
}

function pauseOtherClips(e) {
  const me = e.currentTarget;
  document.querySelectorAll('video.mg-video').forEach((v) => {
    if (v !== me && !v.paused) v.pause();
  });
}

function Icon({ d, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON_PREV = 'M15 5l-7 7 7 7';
const ICON_NEXT = 'M9 5l7 7-7 7';
const ICON_CLOSE = 'M6 6l12 12M18 6L6 18';

function Shot({ item, eager }) {
  const { photo } = item;
  return (
    <span className="mg-shot">
      <img
        className="mg-img"
        src={photo.thumb || photo.src}
        alt={item.alt}
        width={photo.w}
        height={photo.h}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onError={markBroken}
      />
    </span>
  );
}

function PolaroidCell({ item, set, index, variant, eager, onOpen }) {
  const tilt = TILTS[index % TILTS.length] * (variant === 'gold' ? 0.7 : 1);
  return (
    <div className="mg-cell" data-mg-reveal="">
      <button
        type="button"
        className={`mg-card mg-card-${variant}`}
        style={{ '--mg-tilt': `${tilt}deg` }}
        aria-label={item.label}
        data-mg-key={`${set}:${index}`}
        onClick={(e) => onOpen(set, index, e.currentTarget)}
      >
        <Shot item={item} eager={eager} />
      </button>
    </div>
  );
}

function SectionHead({ id, kicker, title, sub }) {
  return (
    <header className="mg-sec-head">
      <p className="mg-kicker">{kicker}</p>
      <h2 id={id} className="mg-h2" tabIndex={-1}>
        {title}
      </h2>
      {sub ? <p className="mg-sec-sub">{sub}</p> : null}
    </header>
  );
}

// ---------- Sections (memoised: opening the lightbox shouldn't re-render ~95 cards) ----------

const Album = memo(function Album({ onOpen }) {
  const { chapters, sets, clips } = ALBUM;

  let usSub = '';
  if (chapters.length) {
    const first = dateParts(chapters[0].date).month;
    const last = dateParts(chapters[chapters.length - 1].date).month;
    const span = first && last ? (first === last ? `in ${first}` : `${first} to ${last}`) : '';
    usSub = joinBits(`${word(chapters.length)} little ${plural(chapters.length, 'chapter', 'chapters')}`, span);
  }

  return (
    <>
      {sets.us.length ? (
        <section id="mg-us" className="mg-sec" aria-labelledby="mg-us-h">
          <SectionHead id="mg-us-h" kicker="Chapter by chapter" title="Us" sub={usSub} />
          {chapters.map((ch, c) => (
            <article key={ch.key} className="mg-chapter" aria-labelledby={`mg-ch-${c}`}>
              <header className="mg-ch-head">
                <span className="mg-ch-num">Chapter {word(c + 1)}</span>
                <h3 id={`mg-ch-${c}`} className="mg-ch-title">
                  {ch.title}
                </h3>
                {ch.note ? <p className="mg-ch-note">{ch.note}</p> : null}
              </header>
              <div className={`mg-masonry${ch.count <= 3 ? ` mg-few-${ch.count}` : ''}`}>
                {sets.us.slice(ch.start, ch.start + ch.count).map((item, i) => (
                  <PolaroidCell
                    key={item.photo.id}
                    item={item}
                    set="us"
                    index={ch.start + i}
                    variant="us"
                    eager={ch.start + i < 4}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {sets.her.length ? (
        <section id="mg-you" className="mg-sec" aria-labelledby="mg-you-h">
          <SectionHead id="mg-you-h" kicker="Only you" title="Just you" sub="every version of you is my favourite" />
          <div className="mg-masonry mg-masonry-gold">
            {sets.her.map((item, i) => (
              <PolaroidCell key={item.photo.id} item={item} set="her" index={i} variant="gold" onOpen={onOpen} />
            ))}
          </div>
        </section>
      ) : null}

      {sets.calls.length ? (
        <section id="mg-calls" className="mg-sec" aria-labelledby="mg-calls-h">
          <SectionHead
            id="mg-calls-h"
            kicker="Late nights"
            title="On call with you"
            sub="even through a screen, my favourite view"
          />
          <div className="mg-phones" style={{ '--mg-call-ar': CALL_AR }}>
            {sets.calls.map((item, i) => (
              <div key={item.photo.id} className="mg-pcell" data-mg-reveal="">
                <button
                  type="button"
                  className="mg-phone"
                  aria-label={item.label}
                  data-mg-key={`calls:${i}`}
                  onClick={(e) => onOpen('calls', i, e.currentTarget)}
                >
                  <Shot item={item} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {clips.length ? (
        <section id="mg-clips" className="mg-sec" aria-labelledby="mg-clips-h">
          <SectionHead id="mg-clips-h" kicker="Press play" title="Little clips" sub="a few seconds of you, on repeat in my head" />
          <div className="mg-clips">
            {clips.map((clip) => (
              <figure
                key={clip.id}
                className="mg-clip"
                data-mg-reveal=""
                style={{ '--mg-ar': clip.w && clip.h ? `${clip.w} / ${clip.h}` : '9 / 16' }}
              >
                <div className="mg-phone mg-phone-clip">
                  <video
                    className="mg-video"
                    controls
                    playsInline
                    preload="metadata"
                    src={`${clip.src}#t=0.1`}
                    width={clip.w}
                    height={clip.h}
                    aria-label={clip.caption ? `Video of ${HER}: ${clip.caption}` : `Video of ${HER}`}
                    onPlay={pauseOtherClips}
                  />
                </div>
                {clip.caption ? <figcaption className="mg-clip-cap">{clip.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
});

// ---------- Lightbox ----------

function LbFrame({ item, dir, frameRef }) {
  const [loaded, setLoaded] = useState(false);
  const { photo } = item;
  const ar = photo.w > 0 && photo.h > 0 ? photo.w / photo.h : 0.75;

  const onFullLoad = (e) => {
    const el = e.currentTarget;
    const decoded = typeof el.decode === 'function' ? el.decode().catch(() => {}) : Promise.resolve();
    decoded.then(() => setLoaded(true));
  };

  return (
    <div ref={frameRef} className="mg-lb-frame" data-dir={dir} style={{ '--mg-ar': ar.toFixed(4) }}>
      {photo.thumb ? (
        <img
          className="mg-lb-img"
          src={photo.thumb}
          alt=""
          aria-hidden="true"
          width={photo.w}
          height={photo.h}
          draggable={false}
        />
      ) : null}
      <img
        className={`mg-lb-img mg-lb-full${loaded ? ' mg-lb-loaded' : ''}`}
        src={photo.src}
        alt={item.alt}
        width={photo.w}
        height={photo.h}
        decoding="async"
        draggable={false}
        onLoad={onFullLoad}
      />
    </div>
  );
}

function Lightbox({ items, index, dir, onStep, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const frameRef = useRef(null);
  const drag = useRef(null);
  const swipedRef = useRef(false);
  const count = items.length;
  const item = items[index];

  // Lock the page, hush any playing clip, and move focus into the dialog.
  useEffect(() => {
    const { body, documentElement: html } = document;
    const prevOverflow = body.style.overflow;
    const prevGutter = html.style.scrollbarGutter;
    html.style.scrollbarGutter = 'stable';
    body.style.overflow = 'hidden';
    document.querySelectorAll('video.mg-video').forEach((v) => v.pause());
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      body.style.overflow = prevOverflow;
      html.style.scrollbarGutter = prevGutter;
    };
  }, []);

  // Esc / arrows, and keep Tab inside the dialog.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' && count > 1) {
        e.preventDefault();
        onStep(1);
      } else if (e.key === 'ArrowLeft' && count > 1) {
        e.preventDefault();
        onStep(-1);
      } else if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        const nodes = dialog ? Array.from(dialog.querySelectorAll('button')) : [];
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const current = document.activeElement;
        const inside = dialog.contains(current);
        if (e.shiftKey && (current === first || !inside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (current === last || !inside)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [count, onClose, onStep]);

  // Warm up the neighbours so next/prev feel instant.
  useEffect(() => {
    if (count < 2) return;
    for (const d of [1, -1]) {
      const { photo } = items[(index + d + count) % count];
      for (const url of [photo.thumb, photo.src]) {
        if (!url) continue;
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      }
    }
  }, [items, index, count]);

  // Swipe left/right to move. (Closing on a backdrop tap happens on `click`,
  // the last event of a tap, so no ghost click lands on the card underneath.)
  const onPointerDown = (e) => {
    swipedRef.current = false;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button')) return;
    if (drag.current) {
      drag.current.multi = true; // second finger: a pinch, not a swipe
      return;
    }
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
      dx: 0,
      moved: false,
      multi: false,
    };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || d.multi) return;
    d.dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(d.dx) + Math.abs(dy) > 10) {
      d.moved = true;
      // Capture only once it's a drag: capturing on down would retarget a plain
      // tap's click to the dialog (and close it when she taps the photo).
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }
    const f = frameRef.current;
    if (d.moved && count > 1 && f && Math.abs(d.dx) > Math.abs(dy)) {
      f.style.transition = 'none';
      f.style.translate = `${d.dx}px 0`;
      f.style.opacity = String(1 - Math.min(Math.abs(d.dx) / 700, 0.3));
    }
  };

  const finish = (e, cancelled) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const f = frameRef.current;
    if (f) {
      f.style.transition = '';
      f.style.translate = '';
      f.style.opacity = '';
    }
    if (d.moved || d.multi) swipedRef.current = true;
    if (cancelled || d.multi || !d.moved) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const zoomed = (window.visualViewport?.scale || 1) > 1.05;
    const fast = Math.abs(dx) > 24 && Math.abs(dx) / Math.max(1, e.timeStamp - d.t) > 0.45;
    if (!zoomed && count > 1 && Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > 56 || fast)) {
      onStep(dx < 0 ? 1 : -1);
    }
  };

  const onBackdropClick = (e) => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    if (e.target.closest('button, .mg-lb-frame')) return;
    onClose();
  };

  if (!item) return null;
  const frameDir = dir > 0 ? 'next' : dir < 0 ? 'prev' : 'open';

  return (
    <div
      ref={dialogRef}
      className="mg-lb"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      aria-describedby="mg-lb-cap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      onClick={onBackdropClick}
    >
      <div className="mg-lb-top">
        <p className="mg-lb-count" aria-live="polite" aria-atomic="true">
          <span className="mg-sr">Photo </span>
          {index + 1} / {count}
        </p>
        <button ref={closeRef} type="button" className="mg-lb-btn" aria-label="Close photo" onClick={onClose}>
          <Icon d={ICON_CLOSE} size={20} />
        </button>
      </div>

      <div className="mg-lb-stage">
        <LbFrame key={item.photo.id} item={item} dir={frameDir} frameRef={frameRef} />
      </div>

      <div className="mg-lb-bottom">
        {count > 1 ? (
          <button type="button" className="mg-lb-btn mg-lb-nav mg-lb-prev" aria-label="Previous photo" onClick={() => onStep(-1)}>
            <Icon d={ICON_PREV} />
          </button>
        ) : (
          <span />
        )}
        <p id="mg-lb-cap" className="mg-lb-cap">
          {item.caption ? <span className="mg-lb-cap-title">{item.caption}</span> : null}
          {item.date ? <span className="mg-lb-cap-date">{dayMonth(item.date)}</span> : null}
        </p>
        {count > 1 ? (
          <button type="button" className="mg-lb-btn mg-lb-nav mg-lb-next" aria-label="Next photo" onClick={() => onStep(1)}>
            <Icon d={ICON_NEXT} />
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function MemoriesGallery() {
  const rootRef = useRef(null);
  const sentinelRef = useRef(null);
  const tabsRef = useRef(null);
  const openerRef = useRef(null);
  const lastOpenRef = useRef(null);
  const pushedRef = useRef(false);
  const [open, setOpen] = useState(null); // { set, index, dir }
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState(null);
  const isOpen = open !== null;

  const openPhoto = useCallback((set, index, el) => {
    openerRef.current = el || null;
    setOpen({ set, index, dir: 0 });
  }, []);

  const step = useCallback((delta) => {
    setOpen((o) => {
      if (!o) return o;
      const n = ALBUM.sets[o.set].length;
      return { ...o, index: (o.index + delta + n) % n, dir: delta };
    });
  }, []);

  const close = useCallback(() => {
    setOpen(null);
    if (pushedRef.current) {
      pushedRef.current = false;
      try {
        window.history.back();
      } catch {}
    }
  }, []);

  // Fade/rise cards in as they scroll into view. Anything already on screen
  // stays put, so there is no flash on load; no-JS and reduced motion see
  // everything straight away.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window) || prefersReduced()) return;
    const items = Array.from(root.querySelectorAll('[data-mg-reveal]'));
    const vh = window.innerHeight;
    for (const el of items) {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.setAttribute('data-mg-in', '');
    }
    root.setAttribute('data-mg-anim', '');
    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          el.style.transitionDelay = `${Math.min(n, 6) * 70}ms`;
          el.setAttribute('data-mg-in', '');
          io.unobserve(el);
          n += 1;
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 },
    );
    items.forEach((el) => {
      if (!el.hasAttribute('data-mg-in')) io.observe(el);
    });
    return () => {
      io.disconnect();
      root.removeAttribute('data-mg-anim');
    };
  }, []);

  // Is the chip bar stuck to the top? (It makes room for the hamburger on phones.)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Highlight the chip for the section in view.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
          else if (entry.target.id === SECTIONS[0]?.id && entry.boundingClientRect.top > 0) setActive(null);
        }
      },
      { rootMargin: '-30% 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Keep the active chip visible inside the (horizontally scrollable) chip row.
  useEffect(() => {
    const row = tabsRef.current;
    if (!row || !active || row.scrollWidth <= row.clientWidth + 1) return;
    const chip = row.querySelector(`a[href="#${active}"]`);
    if (!chip) return;
    const rr = row.getBoundingClientRect();
    const cr = chip.getBoundingClientRect();
    const delta = cr.left + cr.width / 2 - (rr.left + rr.width / 2);
    if (Math.abs(delta) > 4) row.scrollBy({ left: delta, behavior: prefersReduced() ? 'instant' : 'smooth' });
  }, [active]);

  // Phone back button / back swipe closes the photo instead of leaving the page.
  useEffect(() => {
    if (!isOpen) return;
    if (!pushedRef.current) {
      try {
        window.history.pushState({ mgLightbox: true }, '');
        pushedRef.current = true;
      } catch {}
    }
    const onPop = () => {
      pushedRef.current = false;
      setOpen(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isOpen]);

  // On close, hand focus back to the photo she ended on (or the one she opened).
  useEffect(() => {
    if (open) {
      lastOpenRef.current = open;
      return;
    }
    const last = lastOpenRef.current;
    if (!last) return;
    lastOpenRef.current = null;
    const card = rootRef.current?.querySelector(`[data-mg-key="${last.set}:${last.index}"]`);
    const opener = openerRef.current;
    openerRef.current = null;
    const target = card || opener;
    if (!target) return;
    // She swiped to a different photo: bring that one into view behind the closing viewer.
    if (card && card !== opener) card.scrollIntoView({ block: 'nearest' });
    target.focus({ preventScroll: true });
  }, [open]);

  const jumpTo = (e, id) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: prefersReduced() ? 'instant' : 'smooth', block: 'start' });
    setActive(id);
    el.querySelector('h2')?.focus({ preventScroll: true });
  };

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: prefersReduced() ? 'instant' : 'smooth' });
  };

  return (
    <div className="bd-root mg-root" ref={rootRef}>
      <div className="mg-page" inert={isOpen}>
        <div className="mg-wrap">
          <header className="mg-head">
            <p className="mg-kicker">
              {HER} &amp; {ME}
            </p>
            <h1 className="mg-title">Our little album</h1>
            <p className="mg-sub">for you, {HER}, on your birthday 🌸</p>
            {COUNTS ? <p className="mg-counts">{COUNTS}</p> : null}
            <span className="mg-orn" aria-hidden="true">
              ✿
            </span>
          </header>
        </div>

        <div ref={sentinelRef} className="mg-sentinel" aria-hidden="true" />
        {SECTIONS.length > 1 ? (
          <nav className={`mg-tabs${stuck ? ' mg-tabs-stuck' : ''}`} aria-label="Album sections">
            <ul className="mg-tabs-row" ref={tabsRef}>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="mg-chip"
                    aria-current={active === s.id ? 'location' : undefined}
                    onClick={(e) => jumpTo(e, s.id)}
                  >
                    {s.label}
                    <span className="mg-chip-n" aria-hidden="true">
                      {s.count}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="mg-wrap">
          <Album onOpen={openPhoto} />

          <footer className="mg-foot">
            <p className="mg-foot-note">…and so many more still to take ♡</p>
            <div className="mg-foot-actions">
              <Link href="/birthday" className="bd-btn">
                Back to your surprise 🎂
              </Link>
              <button type="button" className="bd-btn-ghost" onClick={toTop}>
                Back to top ↑
              </button>
            </div>
            <p className="mg-sign">made with all my love · {ME}</p>
          </footer>
        </div>
      </div>

      {open ? (
        <Lightbox items={ALBUM.sets[open.set]} index={open.index} dir={open.dir} onStep={step} onClose={close} />
      ) : null}
    </div>
  );
}
