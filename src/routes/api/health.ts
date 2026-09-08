import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';
import { missingEnv } from '../../lib/env.js';

export const prerender = false;

// Readiness probe for setup/debugging. In production it returns only `ok` so it
// never reveals which specific env vars are unset; in dev it lists them.
export const GET: APIRoute = async () => {
  const missing = missingEnv();
  const ok = missing.length === 0;
  const version = config.version;
  const body = import.meta.env.PROD ? { ok, version } : { ok, version, missing };
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 503,
    headers: { 'content-type': 'application/json' },
  });
};
