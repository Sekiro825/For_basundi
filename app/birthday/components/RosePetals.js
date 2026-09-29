'use client';

import { useEffect, useRef, useState } from 'react';
import { ROSE_TONES } from './Rose';
import '../scenes/celebration/roses.css';

// Every tone she loves (the palette has no red in it).
const TONES = Object.values(ROSE_TONES);

// Soft teardrop: pointed where it left the flower (+y), rounded top with a tiny notch.
function petalPath(w, h) {
  const p = new Path2D();
  p.moveTo(0, h);
  p.bezierCurveTo(-w * 1.2, h * 0.35, -w * 1.1, -h * 0.9, -w * 0.25, -h);
  p.quadraticCurveTo(0, -h * 0.86, w * 0.25, -h);
  p.bezierCurveTo(w * 1.1, -h * 0.9, w * 1.2, h * 0.35, 0, h);
  p.closePath();
  return p;
}

// Rose petals drifting down and across the whole viewport, behind the chrome.
export default function RosePetals({ density = 1 }) {
  const canvasRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  // Off under prefers-reduced-motion (and on the server / first client render).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let petals = [];
    let raf = 0;
    let last = 0;
    let clock = 0;
    let fade = 0;
    let dirty = true;

    const wanted = () => {
      const base = width < 640 ? 9 : width < 1024 ? 12 : 14;
      return Math.max(0, Math.round(base * density));
    };

    // (Re)seed a petal. `anywhere` scatters it on screen, otherwise it starts above the top edge.
    function seed(p, anywhere) {
      const z = Math.random(); // depth: far petals are smaller, slower and fainter
      const tone = TONES[Math.floor(Math.random() * TONES.length)];
      const small = width < 640 ? 0.85 : 1;
      const h = (6 + z * 7) * small;
      const w = h * (0.66 + Math.random() * 0.14);

      p.path = petalPath(w, h);
      p.h = h;
      p.alpha = 0.35 + z * 0.45;
      p.vy = 18 + z * 30 + Math.random() * 8;
      p.vx = width * (0.004 + Math.random() * 0.01);
      p.amp = (12 + Math.random() * 24) * small;
      p.freq = (0.35 + Math.random() * 0.45) * Math.PI * 2;
      p.phase = Math.random() * Math.PI * 2;
      p.rot = Math.random() * Math.PI * 2;
      p.spin = (Math.random() - 0.5) * 1.4;
      p.flip = Math.random() * Math.PI * 2;
      p.flipSpeed = 1 + Math.random() * 2.2;
      p.x = -width * 0.15 + Math.random() * width * 1.15;
      p.y = anywhere ? Math.random() * height : -h * 3 - Math.random() * height * 0.25;

      // Front: base → light. Back (seen mid-tumble): a shade deeper.
      p.front = ctx.createLinearGradient(0, h, 0, -h);
      p.front.addColorStop(0, tone.base);
      p.front.addColorStop(1, tone.light);
      p.back = ctx.createLinearGradient(0, h, 0, -h);
      p.back.addColorStop(0, tone.dark);
      p.back.addColorStop(1, tone.base);
      p.edge = tone.dark;
      return p;
    }

    function resize() {
      dirty = false;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      const r = Math.min(window.devicePixelRatio || 1, 2);
      if (w === width && h === height && r === dpr) return;
      const first = width === 0;
      width = w;
      height = h;
      dpr = r;
      canvas.width = Math.round(w * r);
      canvas.height = Math.round(h * r);

      const n = wanted();
      while (petals.length < n) petals.push(seed({}, first));
      petals.length = n;
    }

    function draw(p) {
      const s = Math.sin(clock * p.freq + p.phase);
      const x = p.x + s * p.amp;
      const r = p.rot + Math.cos(clock * p.freq + p.phase) * 0.35; // lean into the sway
      const turn = Math.cos(p.flip); // fake 3D tumble
      const sx = Math.abs(turn) < 0.08 ? (turn < 0 ? -0.08 : 0.08) : turn;
      const sy = 0.85 + 0.15 * Math.sin(p.flip * 0.7 + p.phase);
      const cos = Math.cos(r);
      const sin = Math.sin(r);

      ctx.setTransform(dpr * cos * sx, dpr * sin * sx, -dpr * sin * sy, dpr * cos * sy, dpr * x, dpr * p.y);
      ctx.globalAlpha = p.alpha * fade;
      ctx.fillStyle = turn >= 0 ? p.front : p.back;
      ctx.fill(p.path);
      ctx.globalAlpha = p.alpha * fade * 0.5;
      ctx.strokeStyle = p.edge;
      ctx.lineWidth = 0.7;
      ctx.stroke(p.path);
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (dirty) resize();
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      clock += dt;
      fade = Math.min(1, fade + dt / 1.6);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const wind = (Math.sin(clock * 0.05) * 0.6 + Math.sin(clock * 0.11 + 2) * 0.4) * width * 0.008;
      for (const p of petals) {
        p.y += p.vy * dt;
        p.x += (p.vx + wind) * dt;
        p.rot += p.spin * dt;
        p.flip += p.flipSpeed * dt;
        const margin = p.amp + p.h * 2;
        if (p.y - p.h * 2 > height || p.x - margin > width || p.x + margin < -width * 0.3) seed(p, false);
        draw(p);
      }
      ctx.globalAlpha = 1;
    }

    function start() {
      if (raf || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    const onResize = () => {
      dirty = true;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      petals = [];
    };
  }, [enabled, density]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="bd-petals" aria-hidden="true" />;
}
