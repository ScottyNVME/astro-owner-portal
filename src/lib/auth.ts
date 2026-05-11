import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { AstroCookies } from 'astro';

const COOKIE_NAME = 'op_session';
const SESSION_HOURS = 4;

function getSecret(): Uint8Array {
  const raw = import.meta.env.JWT_SECRET ?? process.env.JWT_SECRET;
  if (!raw) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(raw);
}

export async function verifyPassword(plain: string): Promise<boolean> {
  const hash = import.meta.env.ADMIN_PASSWORD_HASH ?? process.env.ADMIN_PASSWORD_HASH;
  if (!hash) throw new Error('ADMIN_PASSWORD_HASH not set');
  return bcrypt.compare(plain, hash);
}

export async function issueSession(cookies: AstroCookies): Promise<void> {
  const token = await new SignJWT({ owner: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecret());

  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function readSession(cookies: AstroCookies): Promise<boolean> {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.owner === true;
  } catch {
    return false;
  }
}

export function clearSession(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

// In-memory login attempt tracker. Survives the lifetime of a single Vercel
// function instance — enough to deter brute force on a shared password. If
// stronger guarantees are needed later, move to Vercel KV.
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function isRateLimited(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAttempt > WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(ip: string): void {
  const entry = failedAttempts.get(ip);
  if (!entry || Date.now() - entry.firstAttempt > WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAttempt: Date.now() });
  } else {
    entry.count += 1;
  }
}

export function resetAttempts(ip: string): void {
  failedAttempts.delete(ip);
}
