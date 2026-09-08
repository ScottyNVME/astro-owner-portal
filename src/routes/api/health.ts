import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';
import { missingEnv } from '../../lib/env.js';
import { probeRepo } from '../../lib/github.js';

export const prerender = false;

// Readiness probe for setup/debugging. In production it returns only `ok` so it
// never reveals which specific env vars are unset; in dev it lists them.
export const GET: APIRoute = async () => {
  const missing = missingEnv();
  const ok = missing.length === 0;
  const version = config.version;
  // Only probe when the env is complete; otherwise the probe would just fail
  // on the missing variable and add noise.
  const github = ok ? await probeRepo() : 'skipped';
  const healthy = ok && github === 'ok';
  const body = import.meta.env.PROD
    ? { ok: healthy, version, github }
    : { ok: healthy, version, github, missing };
  return new Response(JSON.stringify(body), {
    status: healthy ? 200 : 503,
    headers: { 'content-type': 'application/json' },
  });
};
