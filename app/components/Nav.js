import Link from 'next/link';
import { getUserRole, logout } from '../actions';
import './Nav.css';

export default async function Nav() {
  const userRole = await getUserRole();
  const isLoggedIn = !!userRole;
  const isAdmin = userRole === 'admin';

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <Link href={isLoggedIn ? "/home" : "/"} className="nav-logo">
          ✨ Grishma & Saket
        </Link>
        
        {isLoggedIn && (
          <div className="nav-links">
            <Link href="/diary" className="nav-link">Diary</Link>
            <Link href="/album" className="nav-link">Album</Link>
            <Link href="/print" className="nav-link">Print 📸</Link>

            {isAdmin && (
              <Link href="/admin" className="nav-link nav-admin-link">Admin ⚙️</Link>
            )}
            <form action={logout} className="logout-form">
              <button type="submit" className="logout-btn">
                Logout 🚪
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}

