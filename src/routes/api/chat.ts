import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      route: 'chat',
      phase: 1,
      brand: config.brand.name,
      model: config.model,
      allowedFiles: config.allowedFiles,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

export const POST: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'chat', phase: 1, message: 'Chat endpoint stub. Phase 3 wires Claude.' }),
    { status: 501, headers: { 'content-type': 'application/json' } },
  );
