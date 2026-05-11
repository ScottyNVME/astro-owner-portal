import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'discard', phase: 1, branchPrefix: config.branchPrefix }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

export const POST: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'discard', phase: 1, message: 'Discard endpoint stub. Phase 3 deletes branches.' }),
    { status: 501, headers: { 'content-type': 'application/json' } },
  );
