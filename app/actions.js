'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData) {
  const password = formData.get('password');
  const cookieStore = await cookies();

  if (password === process.env.ADMIN_PASSWORD) {
    cookieStore.set('user_role', 'admin', { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 30 }); // 30 days
  } else if (password === process.env.USER_PASSWORD) {
    cookieStore.set('user_role', 'user', { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 30 }); // 30 days
  } else {
    throw new Error('Invalid password');
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('user_role');
  redirect('/');
}

export async function getUserRole() {
  const cookieStore = await cookies();
  return cookieStore.get('user_role')?.value || null;
}
