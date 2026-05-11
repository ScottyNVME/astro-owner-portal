import type { APIRoute } from 'astro';
import { readSession } from '../../lib/auth.js';
import { chat, BudgetExhaustedError, RateLimitedError, type ChatMessage } from '../../lib/claude.js';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await readSession(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: { history?: ChatMessage[]; message?: string };
  try {
    body = (await request.json()) as { history?: ChatMessage[]; message?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return new Response(JSON.stringify({ error: 'Message is required.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (message.length > 4000) {
    return new Response(JSON.stringify({ error: 'Message is too long (max 4000 chars).' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (history.length > 40) {
    return new Response(
      JSON.stringify({ error: 'Conversation is too long. Refresh to start a new session.' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  try {
    const result = await chat(history, message);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof BudgetExhaustedError) {
      return new Response(
        JSON.stringify({
          errorCode: 'budget_exhausted',
          resetDate: err.resetDate,
          error: 'The monthly Claude budget for this site has been reached.',
        }),
        { status: 402, headers: { 'content-type': 'application/json' } },
      );
    }
    if (err instanceof RateLimitedError) {
      return new Response(
        JSON.stringify({
          errorCode: 'rate_limited',
          retryAfterSec: err.retryAfterSec,
          error: 'Too many requests in a short time. Try again shortly.',
        }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      );
    }
    console.error('[owner-portal] chat error:', err);
    const reason = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `Chat failed: ${reason}` }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
