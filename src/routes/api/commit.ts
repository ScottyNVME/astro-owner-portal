import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      route: 'commit',
      phase: 1,
      branchPrefix: config.branchPrefix,
      writable: config.allowedFiles.map((f) => f.path),
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

export const POST: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'commit', phase: 1, message: 'Commit endpoint stub. Phase 3 wires GitHub.' }),
    { status: 501, headers: { 'content-type': 'application/json' } },
  );
