'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const ITEMS = [
  { id: 'momo', label: 'Momos', emoji: '🥟', points: 15, msg: 'Hot Steamed Momos caught!' },
  { id: 'fries', label: 'French Fries', emoji: '🍟', points: 15, msg: 'Crispy Fries for Basundi!' },
  { id: 'falooda', label: 'Falooda', emoji: '🍧', points: 20, msg: 'Chilled Creamy Falooda!' },
  { id: 'chinese', label: 'Chinese Noodles', emoji: '🥡', points: 20, msg: 'Hakka Noodles & Dim Sum!' },
  { id: 'chocolate', label: 'Chocolates', emoji: '🍫', points: 25, msg: 'Sweet Chocolates from Saket!' },
  { id: 'heating-pad', label: 'Heating Bag', emoji: '🧸', points: 25, msg: 'Cozy Heating Bag & Hugs!' },
];

const CHEERS = [
  'Saket says: You are doing amazing my queen! 💕',
  'Momo Multiplier unlocked! 🥟✨',
  'Sending extra warm hugs to Basundi! 🧸',
  'Saket is getting your chocolates ready! 🍫',
  'Period Cramp Buster activated! ⚡',
];

export default function ComfortGame({ onWin }) {
  const [gameState, setGameState] = useState('idle'); // idle, playing, won
  const [score, setScore] = useState(0);
  const [basketX, setBasketX] = useState(50); // percentage 0 - 100
  const [fallingItems, setFallingItems] = useState([]);
  const [cheerMsg, setCheerMsg] = useState('Catch all your favorite treats to unlock Saket’s Secret Gift! 🎁');

  const gameLoopRef = useRef(null);
  const containerRef = useRef(null);

  // Web Audio chime helper
  const playChime = (freq = 587.33) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = () => {
    setScore(0);
    setGameState('playing');
    setFallingItems([]);
    setCheerMsg('Catch the falling Momos & Chocolates! 🥟🍫');
  };

  // Mouse / Touch movement for basket
  const handlePointerMove = (e) => {
    if (gameState !== 'playing' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const relativeX = ((clientX - rect.left) / rect.width) * 100;
    setBasketX(Math.max(5, Math.min(95, relativeX)));
  };

  // Game tick loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      // Spawn new item
      if (Math.random() < 0.4) {
        const itemType = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        const newItem = {
          ...itemType,
          id: `${itemType.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          x: Math.random() * 85 + 5, // %
          y: 0, // %
          speed: Math.random() * 1.5 + 1.2,
        };
        setFallingItems((prev) => [...prev, newItem]);
      }

      // Update falling positions & collisions
      setFallingItems((prev) => {
        const nextItems = [];
        let scoreAdd = 0;
        let lastMsg = '';

        for (const item of prev) {
          const nextY = item.y + item.speed;

          // Catch collision check (around y = 85%, basketX near item.x)
          if (nextY >= 80 && nextY <= 90 && Math.abs(item.x - basketX) < 12) {
            scoreAdd += item.points;
            lastMsg = item.msg;
            playChime(item.points * 30 + 400);
          } else if (nextY < 100) {
            nextItems.push({ ...item, y: nextY });
          }
        }

        if (scoreAdd > 0) {
          setScore((s) => {
            const newScore = s + scoreAdd;
            if (newScore >= 100) {
              setGameState('won');
              onWin();
            }
            return newScore;
          });

          if (lastMsg && Math.random() < 0.4) {
            const randomCheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
            setCheerMsg(randomCheer);
          }
        }

        return nextItems;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, basketX, onWin]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      style={{
        background: 'linear-gradient(180deg, #2d0b1e 0%, #4a1232 50%, #1a0512 100%)',
        borderRadius: '20px',
        padding: '24px',
        color: '#fff',
        boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '480px',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* SCORE & CHEER HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', zIndex: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#fda4af' }}>🎮 Basundi’s Craving Catcher</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#fecdd3' }}>{cheerMsg}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '20px', fontSize: '15px', fontWeight: 'bold' }}>
            Score: <span style={{ color: '#f43f5e' }}>{score}</span> / 100
          </div>
          <button
            onClick={onWin}
            style={{
              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(244,63,94,0.4)',
            }}
          >
            🎁 Unlock Gift Instantly
          </button>
        </div>
      </div>

      {/* GAME CANVAS FIELD */}
      {gameState === 'idle' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '16px', zIndex: 10 }}>
          <div style={{ fontSize: '64px' }}>🥟🍟🍧🍫</div>
          <h2 style={{ margin: 0, color: '#fecdd3' }}>Period Comfort Treat Catcher</h2>
          <p style={{ maxWidth: '400px', fontSize: '14px', opacity: 0.9 }}>
            Move your basket to catch falling Momos, French Fries, Falooda, and Chocolates! Reach 100 points to unlock Saket’s Secret Comfort Package & Doorstep Delivery Voucher!
          </p>
          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(135deg, #f43f5e, #be123c)',
              color: '#fff',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(244,63,94,0.5)',
            }}
          >
            🚀 Start Catching Treats!
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '350px' }}>
          {/* FALLING ITEMS */}
          {fallingItems.map((item) => (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: `${item.y}%`,
                left: `${item.x}%`,
                fontSize: '32px',
                transform: 'translate(-50%, -50%)',
                transition: 'top 0.05s linear',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
              }}
            >
              {item.emoji}
            </div>
          ))}

          {/* BASKET / HANDS */}
          <div
            style={{
              position: 'absolute',
              bottom: '5%',
              left: `${basketX}%`,
              transform: 'translateX(-50%)',
              background: 'rgba(244, 63, 94, 0.9)',
              color: '#fff',
              padding: '8px 24px',
              borderRadius: '25px',
              fontWeight: 'bold',
              boxShadow: '0 0 20px rgba(244,63,94,0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
            }}
          >
            <span>🧺 Basundi's Basket</span>
          </div>
        </div>
      )}

      {gameState === 'won' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '16px', zIndex: 10 }}>
          <div style={{ fontSize: '64px', animation: 'bounce 1s infinite' }}>🎉🎁🍫</div>
          <h2 style={{ margin: 0, color: '#f43f5e', fontSize: '28px' }}>YOU WON, MY QUEEN!</h2>
          <p style={{ maxWidth: '420px', fontSize: '15px', color: '#ffe4e6' }}>
            You scored {score} points! You've unlocked Saket's Secret Period Comfort Package and doorstep delivery voucher!
          </p>
          <button
            onClick={onWin}
            style={{
              background: 'linear-gradient(135deg, #f43f5e, #be123c)',
              color: '#fff',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(244,63,94,0.6)',
            }}
          >
            ✨ Claim Your Surprise Gift Now!
          </button>
        </div>
      )}
    </div>
  );
}
