'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate soft floating dust particles
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <>
      <div className="dust-container" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        {particles.map((p) => (
          <div
            key={p.id}
            className="dust-particle"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <section className="hero-section">
        <h1 className="hero-title">For Grishma.</h1>
        <p className="hero-subtitle">
          Every great romance needs a place where its story is kept. This is ours.
          A living, breathing collection of our <span>favorite moments</span>, notes, and memories.
        </p>
      </section>

      <section className="chapters-section">
        <h2 className="chapter-title">The Chapters</h2>
        
        <div className="chapters-grid">
          <Link href="/album" className="chapter-card">
            <span className="chapter-icon">📸</span>
            <h3>The Album</h3>
            <p>
              Like a scrapbook from our favorite coming-of-age movie.
              A growing collection of photos, dates, and the moments in between.
            </p>
          </Link>
          
          <Link href="/notes" className="chapter-card">
            <span className="chapter-icon">💌</span>
            <h3>Love Notes</h3>
            <p>
              Little letters, late-night thoughts, and flowers left on the page.
              A journal written just for you.
            </p>
          </Link>
        </div>
      </section>
    </>
  );
}
