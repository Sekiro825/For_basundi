import Link from 'next/link';
import './Nav.css';

export default function Nav() {
  return (
    <nav className="main-nav">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          ✨ Grishma & Saket
        </Link>
        <div className="nav-links">
          <Link href="/album" className="nav-link">Album</Link>
          <Link href="/notes" className="nav-link">Notes</Link>
        </div>
      </div>
    </nav>
  );
}
