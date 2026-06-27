import type { APIRoute } from 'astro';
import { readSession } from '../../lib/auth.js';
import { revertLastChange } from '../../lib/github.js';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  if (!(await readSession(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const result = await revertLastChange();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[owner-portal] revert error:', err);
    const reason = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: reason }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
