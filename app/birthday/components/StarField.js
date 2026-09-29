'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/gsap';

const TINTS = ['255, 250, 240', '255, 250, 240', '255, 250, 240', '232, 194, 110', '255, 214, 228'];

// Twinkling sky with gentle pointer parallax and the occasional shooting star.
export default function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let stars = [];
    let shooters = [];
    let raf = 0;
    let nextShot = performance.now() + 2500;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(420, Math.floor((width * height) / 2600));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() ** 2 * 1.5 + 0.25,
        a: Math.random() * 0.6 + 0.25,
        speed: Math.random() * 1.8 + 0.5,
        phase: Math.random() * Math.PI * 2,
        depth: Math.random() * 0.9 + 0.1,
        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      }));
    }

    function draw(t) {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      for (const s of stars) {
        const twinkle = reduced ? 1 : 0.6 + 0.4 * Math.sin(t * 0.001 * s.speed + s.phase);
        const x = s.x + pointer.x * s.depth * 16;
        const y = s.y + pointer.y * s.depth * 16;
        ctx.fillStyle = `rgba(${s.tint}, ${s.a * twinkle})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.25) {
          // Soft cross glint on the brightest stars
          ctx.fillStyle = `rgba(${s.tint}, ${0.25 * s.a * twinkle})`;
          ctx.fillRect(x - s.r * 3, y - 0.3, s.r * 6, 0.6);
          ctx.fillRect(x - 0.3, y - s.r * 3, 0.6, s.r * 6);
        }
      }

      if (!reduced && t > nextShot) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        shooters.push({
          x: width * (0.2 + Math.random() * 0.6),
          y: height * Math.random() * 0.35,
          vx: dir * (7 + Math.random() * 5),
          vy: 3 + Math.random() * 2.5,
          life: 1,
        });
        nextShot = t + 3500 + Math.random() * 6500;
      }

      shooters = shooters.filter((s) => s.life > 0);
      for (const s of shooters) {
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.014;
        const tailX = s.x - s.vx * 12;
        const tailY = s.y - s.vy * 12;
        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 244, 230, ${s.life})`);
        grad.addColorStop(1, 'rgba(255, 244, 230, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
    }

    function onPointer(e) {
      pointer.tx = (e.clientX / width - 0.5) * 2;
      pointer.ty = (e.clientY / height - 0.5) * 2;
    }

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return <canvas ref={canvasRef} className="bd-stars" aria-hidden="true" />;
}
