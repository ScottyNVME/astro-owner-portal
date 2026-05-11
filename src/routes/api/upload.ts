import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      route: 'upload',
      phase: 1,
      imageUploadDir: config.imageUploadDir,
      imageMaxWidth: config.imageMaxWidth,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

export const POST: APIRoute = () =>
  new Response(
    JSON.stringify({ route: 'upload', phase: 1, message: 'Upload endpoint stub. Phase 3 wires sharp + GitHub.' }),
    { status: 501, headers: { 'content-type': 'application/json' } },
  );
