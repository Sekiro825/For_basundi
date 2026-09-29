'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// It's Parshvi's birthday, so the sidebar only shows the birthday pages.
// Diary, Album, Photo Booth and Admin still exist at their URLs, just unlinked.
const LINKS = [
  { href: '/birthday', label: 'Birthday', icon: '🎂', exact: true },
  { href: '/birthday/memories', label: 'Our Memories', icon: '📸' },
];

// Only Saket (admin) sees this: runs the whole surprise before midnight,
// with a scene switcher. Parshvi should log in with the user password.
const PREVIEW_LINK = { href: '/birthday?preview', label: 'Test run', icon: '🧪' };

const STORAGE_KEY = 'sidebar:collapsed';

function formatLabel(link) {
  return link.trailing ? `${link.label} ${link.trailing}` : link.label;
}

export default function NavClient({ isAdmin }) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const navRef = useRef(null);
  const drawerId = 'primary-sidebar';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
      if (stored === 'false') setCollapsed(false);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed, hydrated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) closeMobile();
  }, [closeMobile]);

  const closeBtnRef = useRef(null);
  useEffect(() => {
    if (mobileOpen && closeBtnRef.current) {
      const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [mobileOpen]);

  const navWidth = hydrated && collapsed ? 'var(--nav-width-collapsed)' : 'var(--nav-width)';

  return (
    <>
      <button
        type="button"
        className="mobile-hamburger"
        onClick={openMobile}
        aria-label="Open navigation menu"
        aria-controls={drawerId}
        aria-expanded={mobileOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`sidebar-backdrop${mobileOpen ? ' visible' : ''}`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <nav
        ref={navRef}
        id={drawerId}
        className={`sidebar${collapsed ? ' collapsed' : ' expanded'}${
          mobileOpen ? ' mobile-open' : ''
        }`}
        role="navigation"
        aria-label="Primary"
        data-collapsed={collapsed ? 'true' : 'false'}
        data-mobile-open={mobileOpen ? 'true' : 'false'}
        style={{ width: mobileOpen ? 'var(--nav-width)' : navWidth }}
      >
        <div className="sidebar-header">
          <Link
            href="/birthday"
            className="sidebar-logo"
            aria-label="Home — Parshvi & Saket"
            onClick={closeMobile}
          >
            <span className="sidebar-logo-icon" aria-hidden="true">
              <span className="sidebar-logo-avatar-wrap">
                <img src="/birthday/media/photos/avatar-saket.jpg" alt="Saket" className="sidebar-logo-avatar avatar-saket" />
                <img src="/birthday/media/photos/avatar-parshvi.jpg" alt="Parshvi" className="sidebar-logo-avatar avatar-parshvi" />
              </span>
            </span>
            <span className="sidebar-logo-text">Parshvi & Saket</span>
          </Link>
          {mobileOpen && (
            <button
              ref={closeBtnRef}
              type="button"
              className="sidebar-close-btn"
              onClick={closeMobile}
              aria-label="Close navigation menu"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          )}
        </div>

        <ul className="sidebar-links" role="list">
          {(isAdmin ? [...LINKS, PREVIEW_LINK] : LINKS).map((link) => {
            const active = pathname === link.href || (!link.exact && pathname?.startsWith(link.href + '/'));
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`sidebar-link${active ? ' active' : ''}`}
                  onClick={closeMobile}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? formatLabel(link) : undefined}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">{link.icon}</span>
                  <span className="sidebar-link-label">{formatLabel(link)}</span>
                  <span className="sidebar-link-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </span>
                  {collapsed && <span className="sidebar-tooltip">{formatLabel(link)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={toggleCollapse}
            aria-expanded={!collapsed}
            aria-controls={drawerId}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`chevron-icon${collapsed ? ' flipped' : ''}`}
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="sidebar-collapse-text">{collapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
