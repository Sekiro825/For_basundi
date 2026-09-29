'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BIRTHDAY_COOKIE, BIRTHDAY_MAX_AGE, createBirthdayToken } from './lib/birthdayAuth';

// Secure cookies are dropped on plain-http LAN addresses, which would block
// testing on a phone against the dev server; production stays https-only.
const secure = process.env.NODE_ENV === 'production';

export async function login(formData) {
  const password = formData.get('password');
  const cookieStore = await cookies();

  let role;
  if (password && password === process.env.ADMIN_PASSWORD) {
    role = 'admin';
  } else if (password && password === process.env.USER_PASSWORD) {
    role = 'user';
  } else {
    throw new Error('Invalid password');
  }

  cookieStore.set('user_role', role, { httpOnly: true, secure, maxAge: 60 * 60 * 24 * 30 }); // 30 days
  // Signed token that actually guards the private birthday pages and photos.
  cookieStore.set(BIRTHDAY_COOKIE, await createBirthdayToken(role), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: BIRTHDAY_MAX_AGE,
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('user_role');
  cookieStore.delete(BIRTHDAY_COOKIE);
  redirect('/');
}

export async function getUserRole() {
  const cookieStore = await cookies();
  return cookieStore.get('user_role')?.value || null;
}
