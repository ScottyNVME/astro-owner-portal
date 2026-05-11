import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'publish', phase: 1, branchPrefix: config.branchPrefix, productionDomain: config.productionDomain }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

export const POST: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'publish', phase: 1, message: 'Publish endpoint stub. Phase 3 merges branches.' }),
    { status: 501, headers: { 'content-type': 'application/json' } },
  );
