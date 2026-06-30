import Link from 'next/link';
import { getUserRole, logout } from '../actions';
import NavClient from './NavClient';
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
          <NavClient isAdmin={isAdmin} logoutAction={logout} />
        )}
      </div>
    </nav>
  );
}

