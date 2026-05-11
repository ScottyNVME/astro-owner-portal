import Anthropic from '@anthropic-ai/sdk';
import config from 'virtual:owner-portal/config';
import { isReadable, isWritable } from './allowlist.js';
import { readFile } from './github.js';

const MAX_TOKENS = 2048;
const MAX_TOOL_ITERATIONS = 8;

function buildSystemPrompt(): string {
  const scopeLines = config.allowedFiles
    .map((f) =>
      f.allowedFields && f.allowedFields.length > 0
        ? `- ${f.path} (only these fields: ${f.allowedFields.join(', ')})`
        : `- ${f.path} (full file editable)`,
    )
    .join('\n');

  const base = `You are the owner portal assistant for the ${config.brand.name} website.

Your job is to help the site owner update their site by editing files via two tools:
- read_file(path) — fetch the current contents of an allowed file
- propose_edit(path, old_string, new_string, summary) — propose a precise text edit. The owner sees a diff and chooses Apply or Cancel. old_string MUST match the file exactly (including whitespace and surrounding context for uniqueness). new_string is the replacement.

How to work:
1. When the owner asks for a change, ALWAYS call read_file first to see current contents.
2. Find the exact text to change. Include enough surrounding context in old_string so the match is unique within the file.
3. Call propose_edit ONCE per turn with a plain-English summary describing the change.
4. After proposing, the owner will apply or cancel. Don't propose multiple edits at once.
5. If unclear (which item? which field?), ASK before proposing.
6. Refuse edits to anything outside the allowed scope below. Politely explain the limit.

Allowed scope for this site:
${scopeLines}

Style: concise, friendly, and appropriate for a small-business owner. No code blocks unless showing literal file content. Don't expose internal field names if a natural-language label exists.`;

  return config.systemPromptExtra ? `${base}\n\n${config.systemPromptExtra}` : base;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read the current contents of an allowed source file. Returns the full file text.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'An allowed file path; the system prompt lists which paths are permitted.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'propose_edit',
    description: 'Propose a single text edit to a file. This does NOT apply the change immediately; it queues a proposal for the owner to review and approve.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Allowed file path.' },
        old_string: { type: 'string', description: 'Exact text to find. Must be unique within the file. Include surrounding context if needed for uniqueness.' },
        new_string: { type: 'string', description: 'Replacement text.' },
        summary: { type: 'string', description: 'One sentence describing the change in plain English for the owner.' },
      },
      required: ['path', 'old_string', 'new_string', 'summary'],
    },
  },
];

export type Proposal = {
  path: string;
  oldString: string;
  newString: string;
  summary: string;
};

export type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };

export type ChatResult = {
  reply: string;
  proposal: Proposal | null;
};

// Thrown when the Anthropic spend cap has been hit. The chat endpoint
// surfaces this so the UI can render a "resets on X" card.
export class BudgetExhaustedError extends Error {
  resetDate: string;
  constructor(msg: string) {
    super(msg);
    this.name = 'BudgetExhaustedError';
    // Anthropic spend limits reset on the 1st of each calendar month (UTC).
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    this.resetDate = next.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
}

export class RateLimitedError extends Error {
  retryAfterSec: number;
  constructor(msg: string, retryAfterSec: number) {
    super(msg);
    this.name = 'RateLimitedError';
    this.retryAfterSec = retryAfterSec;
  }
}

function classifyAnthropicError(err: unknown): Error {
  if (!(err instanceof Anthropic.APIError)) return err instanceof Error ? err : new Error(String(err));

  const looksLikeBilling =
    err.status === 402 ||
    /credit balance|monthly limit|spend (?:limit|cap)|billing|insufficient (?:credit|funds)/i.test(err.message ?? '');

  if (looksLikeBilling) {
    return new BudgetExhaustedError(err.message);
  }

  if (err instanceof Anthropic.RateLimitError) {
    const headers = err.headers as Headers | Record<string, string> | undefined;
    const raw =
      headers instanceof Headers
        ? headers.get('retry-after')
        : headers?.['retry-after'];
    const retryAfter = Number(raw ?? '30');
    return new RateLimitedError(err.message, Number.isFinite(retryAfter) ? retryAfter : 30);
  }

  return err;
}

function getClient(): Anthropic {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey });
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === 'read_file') {
    const path = String(input.path ?? '');
    if (!isReadable(path)) {
      const allowed = config.allowedFiles.map((f) => f.path).join(', ');
      return `ERROR: '${path}' is not in the owner-readable allowlist. Allowed: ${allowed}.`;
    }
    try {
      return await readFile(path);
    } catch (err) {
      return `ERROR reading ${path}: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === 'propose_edit') {
    // We don't apply here — we return a marker so the loop can extract the
    // proposal. We still validate so Claude gets feedback on bad inputs.
    const path = String(input.path ?? '');
    if (!isWritable(path)) {
      const allowed = config.allowedFiles.map((f) => f.path).join(', ');
      return `ERROR: '${path}' is not editable from the owner portal. Allowed: ${allowed}.`;
    }
    if (!input.old_string || !input.new_string) {
      return 'ERROR: old_string and new_string are required.';
    }
    return 'Proposal recorded. Tell the owner what changed in a short sentence so they can review the diff above.';
  }

  return `ERROR: unknown tool '${name}'.`;
}

export async function chat(history: ChatMessage[], userMessage: string): Promise<ChatResult> {
  const client = getClient();
  const systemPrompt = buildSystemPrompt();

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: 'user', content: userMessage });

  let proposal: Proposal | null = null;
  let lastText = '';

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    let resp;
    try {
      resp = await client.messages.create({
        model: config.model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });
    } catch (err) {
      throw classifyAnthropicError(err);
    }

    const textChunks = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text);
    if (textChunks.length > 0) {
      lastText = textChunks.join('\n').trim();
    }

    const toolUses = resp.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) {
      break;
    }

    messages.push({ role: 'assistant', content: resp.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const input = tu.input as Record<string, unknown>;
      const output = await executeTool(tu.name, input);

      if (tu.name === 'propose_edit' && !output.startsWith('ERROR')) {
        proposal = {
          path: String(input.path),
          oldString: String(input.old_string),
          newString: String(input.new_string),
          summary: String(input.summary),
        };
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: output,
        is_error: output.startsWith('ERROR'),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    reply: lastText || 'Done.',
    proposal,
  };
}
