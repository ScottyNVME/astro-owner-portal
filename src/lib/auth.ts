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

// ── Login rate limiting ──────────────────────────────────────────────────
// Durable when an Upstash/Vercel-KV REST endpoint is configured (recommended,
// since Vercel function instances are ephemeral so an in-memory counter resets
// constantly). Falls back to in-memory with a one-time warning otherwise.
const MAX_ATTEMPTS = 5;
const WINDOW_SEC = 15 * 60;

type RateStore = {
  fails(ip: string): Promise<number>;
  bump(ip: string): Promise<void>;
  reset(ip: string): Promise<void>;
};

function memoryStore(): RateStore {
  const map = new Map<string, { count: number; firstAttempt: number }>();
  const windowMs = WINDOW_SEC * 1000;
  return {
    async fails(ip) {
      const e = map.get(ip);
      if (!e) return 0;
      if (Date.now() - e.firstAttempt > windowMs) {
        map.delete(ip);
        return 0;
      }
      return e.count;
    },
    async bump(ip) {
      const e = map.get(ip);
      if (!e || Date.now() - e.firstAttempt > windowMs) {
        map.set(ip, { count: 1, firstAttempt: Date.now() });
      } else {
        e.count += 1;
      }
    },
    async reset(ip) {
      map.delete(ip);
    },
  };
}

let storePromise: Promise<RateStore> | null = null;
function getStore(): Promise<RateStore> {
  if (storePromise) return storePromise;
  storePromise = (async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    if (url && token) {
      try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({ url, token });
        const key = (ip: string) => `op:fail:${ip}`;
        return {
          async fails(ip) {
            return Number((await redis.get<number>(key(ip))) ?? 0);
          },
          async bump(ip) {
            const k = key(ip);
            const n = await redis.incr(k);
            if (n === 1) await redis.expire(k, WINDOW_SEC);
          },
          async reset(ip) {
            await redis.del(key(ip));
          },
        } satisfies RateStore;
      } catch (err) {
        console.warn('[owner-portal] @upstash/redis unavailable; using in-memory rate limit:', err);
      }
    } else {
      console.warn(
        '[owner-portal] No KV/Upstash REST env detected — login rate limit is in-memory (per function instance only). Add KV for durable lockout.',
      );
    }
    return memoryStore();
  })();
  return storePromise;
}

export async function isRateLimited(ip: string): Promise<boolean> {
  const store = await getStore();
  return (await store.fails(ip)) >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  const store = await getStore();
  await store.bump(ip);
}

export async function resetAttempts(ip: string): Promise<void> {
  const store = await getStore();
  await store.reset(ip);
}
