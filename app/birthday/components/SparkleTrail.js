'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/gsap';

const COLORS = ['#e8c26e', '#ffe7a8', '#f48fb1', '#ffd6e4', '#ffffff'];

function drawStar(ctx, size) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? size : size * 0.32;
    const a = (i * Math.PI) / 4;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx, size) {
  const s = size / 1.6;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.6);
  ctx.bezierCurveTo(-s * 1.4, -s * 0.3, -s * 0.6, -s * 1.4, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.6, -s * 1.4, s * 1.4, -s * 0.3, 0, s * 0.6);
  ctx.fill();
}

// Glittery pointer trail (mouse) and tap bursts (touch). Sleeps when idle.
export default function SparkleTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let raf = 0;
    let running = false;
    let last = { x: -99, y: -99 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(x, y, count, burst) {
      for (let i = 0; i < count; i++) {
        const speed = burst ? 1.5 + Math.random() * 4 : 0.3 + Math.random() * 0.8;
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (burst ? 1 : 0.4),
          life: 1,
          decay: 0.014 + Math.random() * 0.02,
          size: (burst ? 3 : 2) + Math.random() * (burst ? 5 : 3),
          spin: (Math.random() - 0.5) * 0.2,
          rot: Math.random() * Math.PI,
          heart: Math.random() < 0.28,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    }

    function tick() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.vx *= 0.98;
        p.rot += p.spin;
        p.life -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.heart ? 0 : p.rot);
        if (p.heart) drawHeart(ctx, p.size);
        else drawStar(ctx, p.size);
        ctx.restore();
      }
      if (particles.length) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }

    function onMove(e) {
      if (e.pointerType !== 'mouse') return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      if (dx * dx + dy * dy < 180) return;
      last = { x: e.clientX, y: e.clientY };
      spawn(e.clientX, e.clientY, 1, false);
    }

    function onDown(e) {
      spawn(e.clientX, e.clientY, e.pointerType === 'mouse' ? 8 : 12, true);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="bd-sparkles" aria-hidden="true" />;
}
