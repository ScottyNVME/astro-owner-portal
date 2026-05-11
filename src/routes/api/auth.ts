import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'auth', phase: 1, brand: config.brand.name, adminPath: config.adminPath }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

export const POST: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'auth', phase: 1, message: 'Auth endpoint stub. Phase 3 ports the real handler.' }),
    { status: 501, headers: { 'content-type': 'application/json' } },
  );
