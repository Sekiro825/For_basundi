'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NavClient({ isAdmin, logoutAction }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest('.main-nav')) setMenuOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuOpen]);

  // Close on route change (escape key too)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        className={`hamburger${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-links${menuOpen ? ' nav-open' : ''}`}>
        <Link href="/diary" className="nav-link" onClick={close}>Diary</Link>
        <Link href="/album" className="nav-link" onClick={close}>Album</Link>
        <Link href="/print" className="nav-link" onClick={close}>Pose 📸</Link>
        {isAdmin && (
          <Link href="/admin" className="nav-link nav-admin-link" onClick={close}>Admin ⚙️</Link>
        )}
        <form action={logoutAction} className="logout-form">
          <button type="submit" className="logout-btn">Logout 🚪</button>
        </form>
      </div>
    </>
  );
}
