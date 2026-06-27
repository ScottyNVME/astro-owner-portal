import type { APIRoute } from 'astro';
import config from 'virtual:owner-portal/config';
import { readSession } from '../../lib/auth.js';
import { isWritable, isFieldEditAllowed, matchingEntry } from '../../lib/allowlist.js';
import { commitEdit } from '../../lib/github.js';

export const prerender = false;

type ApplyBody = {
  path: string;
  oldString: string;
  newString: string;
  summary: string;
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await readSession(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: ApplyBody;
  try {
    body = (await request.json()) as ApplyBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!isWritable(body.path)) {
    return new Response(
      JSON.stringify({ error: `Cannot edit ${body.path} from the owner portal.` }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    );
  }

  // Per-field guard for files that declare allowedFields.
  const entry = matchingEntry(body.path);
  if (entry?.allowedFields) {
    const check = isFieldEditAllowed(body.path, body.oldString, body.newString);
    if (!check.ok) {
      return new Response(JSON.stringify({ error: check.reason ?? 'Field not editable.' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  try {
    await commitEdit({
      path: body.path,
      oldString: body.oldString,
      newString: body.newString,
      message: `Owner portal: ${body.summary}`,
    });

    return new Response(
      JSON.stringify({ ok: true, summary: body.summary, productionDomain: config.productionDomain }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    console.error('[owner-portal] commit error:', err);
    const reason = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: reason }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
