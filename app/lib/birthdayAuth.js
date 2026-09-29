// A signed login token for the private birthday pages and photos.
//
// The older `user_role` cookie is a bare string ("admin"/"user") that anyone
// who reads this public repo could type into their browser. The birthday
// photos need more than that, so login also sets `bd_auth`: role + expiry,
// HMAC-signed with a server-only secret. Web Crypto keeps it usable from both
// proxy.js and route handlers.

export const BIRTHDAY_COOKIE = 'bd_auth';
export const BIRTHDAY_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, like user_role

const ROLES = new Set(['admin', 'user']);
const encoder = new TextEncoder();

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const { ADMIN_PASSWORD, USER_PASSWORD } = process.env;
  // Without any server secret there is nothing safe to sign with: deny everyone.
  if (!ADMIN_PASSWORD && !USER_PASSWORD) return null;
  return `birthday:${ADMIN_PASSWORD || ''}:${USER_PASSWORD || ''}`;
}

function toBase64Url(buffer) {
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

export async function createBirthdayToken(role) {
  if (!ROLES.has(role) || !secret()) return null;
  const payload = `${role}.${Math.floor(Date.now() / 1000) + BIRTHDAY_MAX_AGE}`;
  return `${payload}.${await sign(payload)}`;
}

// Returns 'admin' | 'user' for a valid, unexpired token, otherwise null.
export async function verifyBirthdayToken(token) {
  if (!token || !secret()) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [role, expires, signature] = parts;
  if (!ROLES.has(role) || !(Number(expires) > Date.now() / 1000)) return null;

  const expected = await sign(`${role}.${expires}`);
  if (signature.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? role : null;
}
