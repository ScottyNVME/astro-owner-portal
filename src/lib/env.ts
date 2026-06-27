// Centralized required-env check so misconfiguration surfaces as one clear,
// aggregated message instead of a different cryptic throw per route.

const REQUIRED = [
  'JWT_SECRET',
  'ADMIN_PASSWORD_HASH',
  'ANTHROPIC_API_KEY',
  'GITHUB_TOKEN',
  'GITHUB_REPO',
] as const;

export type RequiredEnv = (typeof REQUIRED)[number];

function read(name: string): string | undefined {
  return import.meta.env[name] ?? process.env[name];
}

/** Names of required env vars that are not set. Empty array == fully configured. */
export function missingEnv(): RequiredEnv[] {
  return REQUIRED.filter((name) => !read(name));
}

/** Throw one aggregated error if any required env var is missing. */
export function assertEnv(): void {
  const missing = missingEnv();
  if (missing.length > 0) {
    throw new Error(
      `[owner-portal] missing required environment variable(s): ${missing.join(', ')}. ` +
        `Set them in your Vercel project (Settings → Environment Variables), or export them in your shell for local dev.`,
    );
  }
}
