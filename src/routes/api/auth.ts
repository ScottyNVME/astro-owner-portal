import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';
import {
  verifyPassword,
  issueSession,
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
} from '../../lib/auth.js';

export const prerender = false;

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const ip = clientIp(request);

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many attempts. Wait 15 minutes and try again.' }),
      { status: 429, headers: { 'content-type': 'application/json' } },
    );
  }

  let password = '';
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } else {
    const form = await request.formData();
    password = String(form.get('password') ?? '');
  }

  if (!password) {
    return new Response(JSON.stringify({ error: 'Password required.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let ok = false;
  try {
    ok = await verifyPassword(password);
  } catch (err) {
    console.error('[owner-portal] auth misconfigured:', err);
    return new Response(JSON.stringify({ error: 'Admin not configured.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!ok) {
    recordFailedAttempt(ip);
    return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  resetAttempts(ip);
  await issueSession(cookies);

  const nextUrl = `${config.adminPath}/chat`;
  if (contentType.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true, next: nextUrl }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return redirect(nextUrl, 303);
};
