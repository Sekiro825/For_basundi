import Link from 'next/link';
import { getUserRole } from '../actions';
import NavClient from './NavClient';
import './Nav.css';

export default async function Nav() {
  const userRole = await getUserRole();
  const isLoggedIn = !!userRole;
  const isAdmin = userRole === 'admin';

  return (
    <>
      {isLoggedIn && <NavClient isAdmin={isAdmin} />}
      <Link
        href={isLoggedIn ? '/birthday' : '/'}
        className="skip-to-content"
        aria-label="Skip to main content"
      >
        Skip to content
      </Link>
    </>
  );
}
