'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { markGiftWon } from './actions';
import CandyGame from './CandyGame';
import TetrisGame from './TetrisGame';
import PacmanGame from './PacmanGame';
import TransparentBouquet from './TransparentBouquet';
import FlowerSpiral from './FlowerSpiral';

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word) {
  let arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.join('') === word) [arr[0], arr[1]] = [arr[1], arr[0]];
  return arr.join('');
}

/* ═══════════════════════════════════════════
   ROOT COMPONENT
   ═══════════════════════════════════════════ */

export default function SurpriseClient({ gifts }) {
  const [activeGift, setActiveGift] = useState(
    gifts.find((g) => g.isRevealed && !g.isClaimed) || gifts.find((g) => g.isRevealed) || gifts[0]
  );

  return (
    <div className="surprise-page fade-in">
      <section className="surprise-hero">
        <p className="surprise-kicker">A tiny arcade made by your favorite menace</p>
        <h1>Grishma&#39;s Surprise Quest</h1>
        <p>Win the mini game, open the gift, then wait for Saket to reveal the next one. Very official. Very cute.</p>
      </section>

      <div className="surprise-shell">
        <aside className="gift-rail" aria-label="Surprise gifts">
          {gifts.map((gift) => (
            <button
              key={gift.key}
              className={`gift-tab ${activeGift.key === gift.key ? 'active' : ''} ${gift.isRevealed ? '' : 'locked'}`}
              onClick={() => setActiveGift(gift)}
            >
              <span>{gift.isClaimed ? '✅' : gift.isRevealed ? gift.emoji : '🔒'}</span>
              <strong>Gift {gift.number}</strong>
              <small>{gift.isRevealed ? gift.title : 'Not revealed yet'}</small>
            </button>
          ))}
        </aside>

        <main className="game-card">
          {!activeGift.isRevealed ? <LockedGift gift={activeGift} /> : <PlayableGift key={activeGift.key} gift={activeGift} />}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SHARED GIFT COMPONENTS
   ═══════════════════════════════════════════ */

function LockedGift({ gift }) {
  return (
    <div className="locked-panel">
      <div className="big-lock">🔒</div>
      <h2>Gift {gift.number} is still hiding</h2>
      <p>Saket has to reveal this from the admin panel. Suspense department is working overtime.</p>
    </div>
  );
}

function PlayableGift({ gift }) {
  const [won, setWon] = useState(gift.isClaimed);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [justWon, setJustWon] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const complete = useCallback(() => {
    if (won) return;
    setWon(true);
    setJustWon(true);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('giftKey', gift.key);
      await markGiftWon(formData);
    });
  }, [won, gift.key]);

  return (
    <>
      <div className="game-heading">
        <span className="gift-emoji">{gift.emoji}</span>
        <div>
          <p>Gift {gift.number}</p>
          <h2>{gift.gameTitle}</h2>
          <small>{gift.hint}</small>
        </div>
      </div>
      {!won ? (
        mounted ? <GameSwitch type={gift.gameType} onWin={complete} /> : <div className="game-loading">Loading game...</div>
      ) : (
        <GiftReveal gift={gift} saving={isPending} justWon={justWon} />
      )}
    </>
  );
}

function GiftReveal({ gift, saving, justWon }) {
  const imagePath = `/assets/bouquet${gift.number}.png`;
  // Show spiral background whenever gift is unlocked
  const [showSpiral, setShowSpiral] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Trigger Big Bouquet modal once spiral bloom expands
  const handleBloomComplete = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleAccept = () => {
    setAccepted(true);
    setShowHeartBurst(true);
    setTimeout(() => {
      setShowModal(false);
      setShowHeartBurst(false);
    }, 1600);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <>
      {showSpiral && <FlowerSpiral onSpiralBloomComplete={handleBloomComplete} />}

      {/* Big Grand Bouquet Modal */}
      {showModal && (
        <div className="big-bouquet-modal-overlay">
          <div className="big-bouquet-modal">
            <div className="modal-sparkles">✨ 🌸 ✨ 💖 ✨</div>
            <p className="modal-subtitle">✨ GRAND GIFT UNLOCKED ✨</p>
            <h2 className="modal-title">{gift.giftTitle}</h2>
            
            <div className="big-bouquet-img-wrapper">
              <TransparentBouquet 
                src={imagePath} 
                alt={gift.giftTitle} 
                className="big-bouquet-img" 
              />
            </div>

            {showHeartBurst ? (
              <div className="accepted-message">
                <span className="heart-burst-icons">💖 🎉 💐 💖</span>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--wine)', marginTop: '0.5rem' }}>
                  Bouquet Accepted & Saved!
                </p>
              </div>
            ) : (
              <div className="modal-action-buttons">
                <button className="accept-gift-btn" onClick={handleAccept}>
                  <span>Accept Bouquet 💖</span>
                </button>
                <button className="cancel-gift-btn" onClick={handleCancel}>
                  <span>Close 🌸</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Unlocked Gift Card (Only shown when modal is closed) */}
      {!showModal && (
        <section className="reveal-card" style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p className="reveal-label" style={{ fontSize: '1.1rem', letterSpacing: '2px' }}>✨ VIRTUAL GIFT UNLOCKED ✨</p>
          <h2 style={{ fontSize: '2.2rem', margin: '1rem 0 2rem 0', color: 'var(--wine)' }}>{gift.giftTitle}</h2>
          <div className="gift-bouquet-container" style={{ margin: '0 auto 2.5rem auto' }}>
            <TransparentBouquet src={imagePath} alt={gift.giftTitle} className="gift-bouquet-img" style={{ transform: 'scale(1.15)', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }} />
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.8rem 1.8rem',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '2px dashed var(--rose)',
            borderRadius: '2rem',
            fontWeight: '600',
            color: 'var(--wine)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
          }}>
            <span style={{ fontSize: '1.4rem' }}>{gift.emoji}</span> {accepted ? 'Bouquet Accepted & Saved in Collection! 💐' : 'Safely added to your collection!'}
          </div>
          {saving && <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>Saving progress...</p>}
        </section>
      )}
    </>
  );
}

function GameSwitch({ type, onWin }) {
  if (type === 'candy') return <CandyGame onWin={onWin} />;
  if (type === 'tetris') return <TetrisGame onWin={onWin} />;
  if (type === 'solitaire') return <SolitaireGame onWin={onWin} />;
  if (type === 'pacman') return <PacmanGame onWin={onWin} />;
  if (type === 'snake') return <SnakeGame onWin={onWin} />;
  if (type === 'slide') return <SlidePuzzle onWin={onWin} />;
  if (type === 'traffic') return <TrafficGame onWin={onWin} />;
  if (type === 'pipes') return <PipePuzzle onWin={onWin} />;
  if (type === 'maze') return <MazeGame onWin={onWin} />;
  if (type === 'quiz') return <QuizGame onWin={onWin} />;
  return <p>Unknown game</p>;
}

/* ═══════════════════════════════════════════
   GAME 2 — SOLITAIRE (Mini FreeCell)
   28 cards (4 suits × 7 values), 7 cols, 3 free cells
   ═══════════════════════════════════════════ */

function SolitaireGame({ onWin }) {
  const SUITS = ['♥', '♦', '♣', '♠'];
  const COLORS = ['red', 'red', 'black', 'black'];
  const MV = 7;
  const LABELS = ['A', '2', '3', '4', '5', '6', '7'];

  function deal() {
    const deck = [];
    for (let s = 0; s < 4; s++) for (let v = 1; v <= MV; v++) deck.push({ s, v, id: `${s}-${v}` });
    const d = shuffle(deck);
    return {
      cols: Array.from({ length: 7 }, (_, i) => d.slice(i * 4, i * 4 + 4)),
      free: [null, null, null],
      fnd: [[], [], [], []],
    };
  }

  const [g, setG] = useState(deal);
  const [sel, setSel] = useState(null);

  function getCard() {
    if (!sel) return null;
    if (sel.f === 'c') { const col = g.cols[sel.i]; return col.length ? col[col.length - 1] : null; }
    return g.free[sel.i];
  }

  function tryMove(to) {
    const card = getCard();
    if (!card) { setSel(null); return; }
    const ng = JSON.parse(JSON.stringify(g));
    if (sel.f === 'c') ng.cols[sel.i].pop(); else ng.free[sel.i] = null;
    let ok = false;

    if (to.t === 'c') {
      const dest = ng.cols[to.i];
      if (dest.length === 0 || (dest[dest.length - 1].v === card.v + 1 && COLORS[dest[dest.length - 1].s] !== COLORS[card.s])) {
        dest.push(card); ok = true;
      }
    } else if (to.t === 'f') {
      if (ng.free[to.i] === null) { ng.free[to.i] = card; ok = true; }
    } else if (to.t === 'fnd') {
      const pile = ng.fnd[card.s];
      if ((pile.length === 0 && card.v === 1) || (pile.length > 0 && pile[pile.length - 1].v === card.v - 1)) {
        pile.push(card); ok = true;
      }
    }

    if (!ok) { if (sel.f === 'c') ng.cols[sel.i].push(card); else ng.free[sel.i] = card; }
    setG(ng); setSel(null);
    if (ng.fnd.every((f) => f.length === MV)) onWin();
  }

  function autoFnd() {
    const ng = JSON.parse(JSON.stringify(g));
    let moved = false;
    for (let i = 0; i < 7 && !moved; i++) {
      const col = ng.cols[i]; if (!col.length) continue;
      const c = col[col.length - 1]; const pile = ng.fnd[c.s];
      if ((pile.length === 0 && c.v === 1) || (pile.length > 0 && pile[pile.length - 1].v === c.v - 1)) {
        pile.push(col.pop()); moved = true;
      }
    }
    for (let i = 0; i < 3 && !moved; i++) {
      if (!ng.free[i]) continue; const c = ng.free[i]; const pile = ng.fnd[c.s];
      if ((pile.length === 0 && c.v === 1) || (pile.length > 0 && pile[pile.length - 1].v === c.v - 1)) {
        pile.push(c); ng.free[i] = null; moved = true;
      }
    }
    if (moved) { setG(ng); if (ng.fnd.every((f) => f.length === MV)) onWin(); }
  }

  function tapCol(i) { sel ? tryMove({ t: 'c', i }) : g.cols[i].length && setSel({ f: 'c', i }); }
  function tapFree(i) { sel ? tryMove({ t: 'f', i }) : g.free[i] && setSel({ f: 'f', i }); }
  function tapFnd() { sel && tryMove({ t: 'fnd' }); }

  return (
    <div className="solitaire-game">
      <p className="game-note" style={{ marginBottom: '0.75rem' }}>Tap card → tap destination. Columns: build ↓ alternating colors. Foundations: A→7 by suit.</p>
      <div className="soli-top">
        <div className="soli-group">
          {g.free.map((card, i) => (
            <div key={i} className={`soli-slot ${sel?.f === 'f' && sel?.i === i ? 'sel' : ''}`} onClick={() => tapFree(i)}>
              {card ? <span className={COLORS[card.s]}>{LABELS[card.v - 1]}{SUITS[card.s]}</span> : '·'}
            </div>
          ))}
        </div>
        <div className="soli-group">
          {g.fnd.map((pile, i) => (
            <div key={i} className="soli-slot fnd-slot" onClick={tapFnd}>
              {pile.length ? <span className={COLORS[i]}>{LABELS[pile[pile.length - 1].v - 1]}{SUITS[i]}</span> : <span className="empty-s">{SUITS[i]}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="soli-cols">
        {g.cols.map((col, ci) => (
          <div key={ci} className="soli-col" onClick={() => tapCol(ci)}>
            {col.length === 0 ? (
              <div className="soli-empty-col">·</div>
            ) : (
              col.map((card, idx) => (
                <div key={card.id} className={`soli-card ${COLORS[card.s]} ${idx === col.length - 1 && sel?.f === 'c' && sel?.i === ci ? 'sel' : ''}`}>
                  {LABELS[card.v - 1]}<span>{SUITS[card.s]}</span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
      <div className="soli-btns">
        <button className="tiny-action" onClick={autoFnd}>Auto → Foundation</button>
        <button className="tiny-action" onClick={() => { setG(deal()); setSel(null); }}>New Deal</button>
      </div>
    </div>
  );
}



/* ═══════════════════════════════════════════
   GAME 4 — SNAKE (12×12 grid, eat 12 hearts)
   ═══════════════════════════════════════════ */

function SnakeGame({ onWin }) {
  const GRID = 12, TARGET = 12;
  const wonRef = useRef(false);

  function randFood(snake) {
    let pos;
    do { pos = [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)]; }
    while (snake.some(([r, c]) => r === pos[0] && c === pos[1]));
    return pos;
  }

  const gameRef = useRef({
    snake: [[6, 4], [6, 3], [6, 2]],
    food: [3, 8],
    dir: [0, 1],
    score: 0,
    over: false,
    speed: 220,
  });

  const [, render] = useState(0);
  const kick = () => render((n) => n + 1);

  useEffect(() => {
    let af; let last = 0;
    const loop = (ts) => {
      const gg = gameRef.current;
      if (gg.over || wonRef.current) return;
      if (ts - last >= gg.speed) {
        last = ts;
        const head = [gg.snake[0][0] + gg.dir[0], gg.snake[0][1] + gg.dir[1]];
        if (head[0] < 0 || head[0] >= GRID || head[1] < 0 || head[1] >= GRID || gg.snake.some(([r, c]) => r === head[0] && c === head[1])) {
          gg.over = true; kick(); return;
        }
        const ns = [head, ...gg.snake];
        if (head[0] === gg.food[0] && head[1] === gg.food[1]) {
          gg.score++;
          if (gg.score >= TARGET) { wonRef.current = true; kick(); onWin(); return; }
          gg.food = randFood(ns);
          if (gg.score % 4 === 0) gg.speed = Math.max(100, gg.speed - 25);
        } else { ns.pop(); }
        gg.snake = ns;
        kick();
      }
      af = requestAnimationFrame(loop);
    };
    af = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(af);
  }, []);

  const dir = (d) => { const gg = gameRef.current; if (gg.dir[0] + d[0] !== 0 || gg.dir[1] + d[1] !== 0) gg.dir = d; };
  const touchRef = useRef(null);
  const onTS = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTE = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    Math.abs(dx) > Math.abs(dy) ? dir([0, dx > 0 ? 1 : -1]) : dir([dy > 0 ? 1 : -1, 0]);
  };

  const restart = () => {
    gameRef.current = { snake: [[6, 4], [6, 3], [6, 2]], food: [3, 8], dir: [0, 1], score: 0, over: false, speed: 220 };
    wonRef.current = false; kick();
  };

  const gg = gameRef.current;
  const snakeSet = new Set(gg.snake.map(([r, c]) => `${r},${c}`));

  return (
    <div style={{ position: 'relative' }}>
      <div className="game-score-bar">
        <span>Hearts: {gg.score} / {TARGET}</span>
        <div className="score-fill" style={{ width: `${(gg.score / TARGET) * 100}%` }} />
      </div>
      <div className="snake-grid" onTouchStart={onTS} onTouchEnd={onTE}>
        {Array.from({ length: GRID * GRID }, (_, i) => {
          const r = Math.floor(i / GRID), c = i % GRID;
          const isHead = gg.snake[0][0] === r && gg.snake[0][1] === c;
          const isBody = !isHead && snakeSet.has(`${r},${c}`);
          const isFood = gg.food[0] === r && gg.food[1] === c;
          return <div key={i} className={`snake-cell ${isHead ? 'head' : isBody ? 'body' : ''} ${isFood ? 'food' : ''}`}>{isHead ? '😊' : isFood ? '💖' : ''}</div>;
        })}
      </div>
      <div className="dpad">
        <button onClick={() => dir([-1, 0])}>↑</button>
        <div><button onClick={() => dir([0, -1])}>←</button><button onClick={() => dir([0, 1])}>→</button></div>
        <button onClick={() => dir([1, 0])}>↓</button>
      </div>
      {gg.over && (
        <div className="game-over-box">
          <p>Oops! 💔 Score: {gg.score}</p>
          <button className="tiny-action" onClick={restart}>Try Again</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   GAME 5 — SLIDE PUZZLE (4×4, 15-puzzle)
   ═══════════════════════════════════════════ */

function SlidePuzzle({ onWin }) {
  function makePuzzle() {
    const tiles = Array.from({ length: 16 }, (_, i) => (i + 1) % 16);
    let ei = 15;
    for (let i = 0; i < 80; i++) {
      const nb = [];
      const r = Math.floor(ei / 4), c = ei % 4;
      if (r > 0) nb.push(ei - 4); if (r < 3) nb.push(ei + 4);
      if (c > 0) nb.push(ei - 1); if (c < 3) nb.push(ei + 1);
      const sw = nb[Math.floor(Math.random() * nb.length)];
      [tiles[ei], tiles[sw]] = [tiles[sw], tiles[ei]];
      ei = sw;
    }
    return tiles;
  }

  const [tiles, setTiles] = useState(makePuzzle);
  const [moves, setMoves] = useState(0);

  const tap = (i) => {
    const ei = tiles.indexOf(0);
    const r = Math.floor(i / 4), c = i % 4;
    const er = Math.floor(ei / 4), ec = ei % 4;
    if (Math.abs(r - er) + Math.abs(c - ec) !== 1) return;
    const n = [...tiles];
    [n[i], n[ei]] = [n[ei], n[i]];
    setTiles(n); setMoves(moves + 1);
    if (n.every((v, idx) => v === (idx + 1) % 16)) onWin();
  };

  return (
    <div>
      <p className="game-note">Moves: {moves}</p>
      <div className="slide-board">
        {tiles.map((v, i) => (
          <button key={i} className={`slide-tile ${v === 0 ? 'empty' : ''}`} onClick={() => v !== 0 && tap(i)}>{v || ''}</button>
        ))}
      </div>
      <button className="tiny-action" style={{ marginTop: '1rem' }} onClick={() => { setTiles(makePuzzle()); setMoves(0); }}>Reshuffle</button>
    </div>
  );
}



/* ═══════════════════════════════════════════
   GAME 7 — TRAFFIC DODGE (3-lane, 25s survival)
   ═══════════════════════════════════════════ */

function TrafficGame({ onWin }) {
  const LANES = 3, ROWS = 10, SURVIVE = 25;
  const OBS_EMOJI = ['🚕', '🚌', '🚛', '🏎️', '🚐'];
  const wonRef = useRef(false);

  const gameRef = useRef({ lane: 1, obs: [], time: 0, over: false, tick: 0 });
  const [, render] = useState(0);
  const kick = () => render((n) => n + 1);

  useEffect(() => {
    let af; let last = 0;
    const loop = (ts) => {
      const gg = gameRef.current;
      if (gg.over || wonRef.current) return;
      if (ts - last >= 180) {
        last = ts;
        gg.tick++;
        gg.time = gg.tick * 0.18;
        if (gg.time >= SURVIVE) { wonRef.current = true; kick(); onWin(); return; }
        gg.obs = gg.obs.map((o) => ({ ...o, y: o.y + 1 })).filter((o) => o.y < ROWS);
        if (gg.obs.some((o) => o.lane === gg.lane && o.y === ROWS - 1)) { gg.over = true; kick(); return; }
        const spawnRate = 0.06 + gg.time * 0.003;
        for (let l = 0; l < LANES; l++) {
          if (Math.random() < spawnRate && !gg.obs.some((o) => o.lane === l && o.y <= 1)) {
            gg.obs.push({ lane: l, y: 0, emoji: OBS_EMOJI[Math.floor(Math.random() * OBS_EMOJI.length)] });
          }
        }
        kick();
      }
      af = requestAnimationFrame(loop);
    };
    af = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(af);
  }, []);

  const move = (dl) => { const gg = gameRef.current; const nl = gg.lane + dl; if (nl >= 0 && nl < LANES) gg.lane = nl; };
  const touchRef = useRef(null);
  const onTS = (e) => { touchRef.current = e.touches[0].clientX; };
  const onTE = (e) => { if (touchRef.current === null) return; const d = e.changedTouches[0].clientX - touchRef.current; if (Math.abs(d) > 30) move(d > 0 ? 1 : -1); touchRef.current = null; };

  const restart = () => { gameRef.current = { lane: 1, obs: [], time: 0, over: false, tick: 0 }; wonRef.current = false; kick(); };
  const gg = gameRef.current;
  const timeLeft = Math.max(0, SURVIVE - gg.time).toFixed(1);

  return (
    <div style={{ position: 'relative' }}>
      <div className="game-score-bar">
        <span>Survive: {timeLeft}s left</span>
        <div className="score-fill" style={{ width: `${Math.min(100, (gg.time / SURVIVE) * 100)}%` }} />
      </div>
      <div className="traffic-road" onTouchStart={onTS} onTouchEnd={onTE}>
        {Array.from({ length: LANES * ROWS }, (_, i) => {
          const r = Math.floor(i / LANES), l = i % LANES;
          const ob = gg.obs.find((o) => o.lane === l && o.y === r);
          const isPlayer = r === ROWS - 1 && l === gg.lane;
          return (
            <div key={i} className={`traffic-cell ${isPlayer ? 'player-cell' : ''} ${r === ROWS - 1 ? 'bottom-row' : ''}`}>
              {isPlayer ? '💕' : ob ? ob.emoji : ''}
            </div>
          );
        })}
      </div>
      <div className="traffic-controls">
        <button className="tiny-action" onClick={() => move(-1)}>← Left</button>
        <button className="tiny-action" onClick={() => move(1)}>Right →</button>
      </div>
      {gg.over && (
        <div className="game-over-box">
          <p>Crash! 💥 Survived {gg.time.toFixed(1)}s</p>
          <button className="tiny-action" onClick={restart}>Try Again</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   GAME 8 — PIPE PUZZLE (4×4 rotation)
   ═══════════════════════════════════════════ */

function PipePuzzle({ onWin }) {
  const SZ = 4;
  const BASES = { straight: [1, 0, 1, 0], corner: [1, 1, 0, 0], end: [1, 0, 0, 0] };

  function rotConns(type, rot) {
    let c = [...BASES[type]];
    for (let i = 0; i < rot; i++) c = [c[3], c[0], c[1], c[2]];
    return c;
  }

  function generate() {
    const path = [[0, 0]];
    let r = 0, c = 0;
    while (r !== SZ - 1 || c !== SZ - 1) {
      if (r === SZ - 1) c++; else if (c === SZ - 1) r++; else if (Math.random() < 0.5) r++; else c++;
      path.push([r, c]);
    }
    const onPath = new Set(path.map(([pr, pc]) => `${pr},${pc}`));
    const grid = Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => ({ type: 'straight', rot: 0 })));

    for (let i = 0; i < path.length; i++) {
      const [pr, pc] = path[i];
      const conns = [false, false, false, false];
      if (i > 0) { const [nr, nc] = path[i - 1]; if (nr < pr) conns[0] = true; if (nr > pr) conns[2] = true; if (nc > pc) conns[1] = true; if (nc < pc) conns[3] = true; }
      if (i < path.length - 1) { const [nr, nc] = path[i + 1]; if (nr < pr) conns[0] = true; if (nr > pr) conns[2] = true; if (nc > pc) conns[1] = true; if (nc < pc) conns[3] = true; }
      const cnt = conns.filter(Boolean).length;
      let type, rot;
      if (cnt === 1) { type = 'end'; rot = conns.indexOf(true); }
      else if (conns[0] && conns[2]) { type = 'straight'; rot = 0; }
      else if (conns[1] && conns[3]) { type = 'straight'; rot = 1; }
      else if (conns[0] && conns[1]) { type = 'corner'; rot = 0; }
      else if (conns[1] && conns[2]) { type = 'corner'; rot = 1; }
      else if (conns[2] && conns[3]) { type = 'corner'; rot = 2; }
      else { type = 'corner'; rot = 3; }
      grid[pr][pc] = { type, correctRot: rot, rot: Math.floor(Math.random() * 4), isPath: true };
    }

    for (let r = 0; r < SZ; r++)
      for (let c = 0; c < SZ; c++)
        if (!onPath.has(`${r},${c}`))
          grid[r][c] = { type: ['straight', 'corner', 'end'][Math.floor(Math.random() * 3)], rot: Math.floor(Math.random() * 4), isPath: false };

    return grid;
  }

  function checkConn(grid) {
    const visited = new Set();
    const q = [[0, 0]]; visited.add('0,0');
    const dirs = [[-1, 0, 0, 2], [0, 1, 1, 3], [1, 0, 2, 0], [0, -1, 3, 1]];
    while (q.length) {
      const [cr, cc] = q.shift();
      if (cr === SZ - 1 && cc === SZ - 1) return true;
      const myC = rotConns(grid[cr][cc].type, grid[cr][cc].rot);
      for (const [dr, dc, myD, thD] of dirs) {
        const nr = cr + dr, nc = cc + dc;
        if (nr < 0 || nr >= SZ || nc < 0 || nc >= SZ || visited.has(`${nr},${nc}`)) continue;
        const nbC = rotConns(grid[nr][nc].type, grid[nr][nc].rot);
        if (myC[myD] && nbC[thD]) { visited.add(`${nr},${nc}`); q.push([nr, nc]); }
      }
    }
    return false;
  }

  const [grid, setGrid] = useState(generate);

  const rotate = (r, c) => {
    const ng = grid.map((row) => row.map((cell) => ({ ...cell })));
    ng[r][c].rot = (ng[r][c].rot + 1) % 4;
    setGrid(ng);
    if (checkConn(ng)) onWin();
  };

  return (
    <div>
      <p className="game-note">Tap to rotate. Connect 🚰 (top-left) to 🏠 (bottom-right)!</p>
      <div className="pipe-grid">
        {grid.flat().map((cell, i) => {
          const r = Math.floor(i / SZ), c = i % SZ;
          const conns = rotConns(cell.type, cell.rot);
          const isStart = r === 0 && c === 0, isEnd = r === SZ - 1 && c === SZ - 1;
          return (
            <div key={i} className={`pipe-cell ${isStart ? 'pipe-start' : ''} ${isEnd ? 'pipe-end' : ''}`} onClick={() => rotate(r, c)}>
              <div className="pipe-center" />
              {conns[0] ? <div className="pipe-arm pipe-top" /> : null}
              {conns[1] ? <div className="pipe-arm pipe-right" /> : null}
              {conns[2] ? <div className="pipe-arm pipe-bottom" /> : null}
              {conns[3] ? <div className="pipe-arm pipe-left" /> : null}
              {isStart && <span className="pipe-label">🚰</span>}
              {isEnd && <span className="pipe-label">🏠</span>}
            </div>
          );
        })}
      </div>
      <button className="tiny-action" style={{ marginTop: '1rem' }} onClick={() => setGrid(generate())}>New Puzzle</button>
    </div>
  );
}





/* ═══════════════════════════════════════════
   GAME 11 — MAZE (7×7 generated, swipe+arrows)
   ═══════════════════════════════════════════ */

function MazeGame({ onWin }) {
  const SZ = 7;

  function generateMaze() {
    const walls = Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => ({ t: true, r: true, b: true, l: true })));
    const visited = Array.from({ length: SZ }, () => Array(SZ).fill(false));
    const dirs = [[-1, 0, 't', 'b'], [0, 1, 'r', 'l'], [1, 0, 'b', 't'], [0, -1, 'l', 'r']];

    function dfs(r, c) {
      visited[r][c] = true;
      const sd = shuffle(dirs);
      for (const [dr, dc, wall, opp] of sd) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < SZ && nc >= 0 && nc < SZ && !visited[nr][nc]) {
          walls[r][c][wall] = false;
          walls[nr][nc][opp] = false;
          dfs(nr, nc);
        }
      }
    }
    dfs(0, 0);
    return walls;
  }

  const [walls, setWalls] = useState(generateMaze);
  const [pos, setPos] = useState([0, 0]);

  const move = (dr, dc) => {
    const [r, c] = pos;
    const dirMap = { '-1,0': 't', '1,0': 'b', '0,-1': 'l', '0,1': 'r' };
    const wallKey = dirMap[`${dr},${dc}`];
    if (walls[r][c][wallKey]) return;
    const nr = r + dr, nc = c + dc;
    setPos([nr, nc]);
    if (nr === SZ - 1 && nc === SZ - 1) onWin();
  };

  const touchRef = useRef(null);
  const onTS = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTE = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1);
    else move(dy > 0 ? 1 : -1, 0);
  };

  const restart = () => { setWalls(generateMaze()); setPos([0, 0]); };

  return (
    <div>
      <div className="maze-grid" onTouchStart={onTS} onTouchEnd={onTE} style={{ gridTemplateColumns: `repeat(${SZ}, 1fr)` }}>
        {walls.flat().map((cell, i) => {
          const r = Math.floor(i / SZ), c = i % SZ;
          const isPlayer = pos[0] === r && pos[1] === c;
          const isGoal = r === SZ - 1 && c === SZ - 1;
          return (
            <div
              key={i}
              className="maze-cell"
              style={{
                borderTop: cell.t ? '3px solid var(--wine)' : '3px solid transparent',
                borderRight: cell.r ? '3px solid var(--wine)' : '3px solid transparent',
                borderBottom: cell.b ? '3px solid var(--wine)' : '3px solid transparent',
                borderLeft: cell.l ? '3px solid var(--wine)' : '3px solid transparent',
              }}
            >
              {isPlayer ? '💖' : isGoal ? '🎁' : ''}
            </div>
          );
        })}
      </div>
      <div className="dpad">
        <button onClick={() => move(-1, 0)}>↑</button>
        <div><button onClick={() => move(0, -1)}>←</button><button onClick={() => move(0, 1)}>→</button></div>
        <button onClick={() => move(1, 0)}>↓</button>
      </div>
      <button className="tiny-action" style={{ marginTop: '0.5rem' }} onClick={restart}>New Maze</button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GAME 12 — QUIZ (5 questions, 3 strikes)
   ═══════════════════════════════════════════ */

function QuizGame({ onWin }) {
  const QS = [
    { q: 'Who is legally required to receive extra forehead kisses?', a: ['You', 'The moon', 'Nobody'], c: 'You' },
    { q: 'What happens when you smile?', a: ['Nothing special', 'I forget to breathe', 'Gravity stops'], c: 'I forget to breathe' },
    { q: 'How many compliments per day is too many?', a: ['Zero', 'Five max', 'There is no limit'], c: 'There is no limit' },
    { q: 'Who won the relationship lottery?', a: ['You did', 'I did', 'Both, but mostly me'], c: 'Both, but mostly me' },
    { q: 'How long is this valid?', a: ['Until Wi-Fi dies', 'One fiscal year', 'Forever and then some'], c: 'Forever and then some' },
  ];

  const [step, setStep] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [wrong, setWrong] = useState(null);

  const answer = (choice) => {
    if (choice !== QS[step].c) {
      setWrong(choice);
      setTimeout(() => setWrong(null), 600);
      const ns = strikes + 1;
      if (ns >= 3) { setStrikes(0); setStep(0); return; }
      setStrikes(ns);
      return;
    }
    if (step === QS.length - 1) { onWin(); return; }
    setStep(step + 1);
  };

  return (
    <div className="quiz-game">
      <div className="quiz-strikes">{'❤️'.repeat(3 - strikes)}{'🖤'.repeat(strikes)}</div>
      <p className="game-note">Question {step + 1} of {QS.length}</p>
      <h3>{QS[step].q}</h3>
      <div className="quiz-answers">
        {QS[step].a.map((a) => (
          <button key={a} className={`tiny-action ${wrong === a ? 'wrong-shake' : ''}`} onClick={() => answer(a)}>{a}</button>
        ))}
      </div>
    </div>
  );
}
