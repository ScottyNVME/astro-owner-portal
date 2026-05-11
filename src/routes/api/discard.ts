import type { APIRoute } from 'astro';
import { readSession } from '../../lib/auth.js';
import { deleteBranch, branchNamePattern } from '../../lib/github.js';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await readSession(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: { branch?: string };
  try {
    body = (await request.json()) as { branch?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const branch = String(body.branch ?? '');
  if (!branchNamePattern().test(branch)) {
    return new Response(JSON.stringify({ error: 'Invalid branch name.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    await deleteBranch(branch);
  } catch {
    // Already deleted is fine.
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
