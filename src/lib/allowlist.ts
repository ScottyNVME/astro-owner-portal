import picomatch from 'picomatch';
import config from 'virtual:owner-portal/config';

// Each allowedFiles[].path is treated as a picomatch pattern. A literal path
// (no glob characters) matches only itself; a glob like `src/content/**/*.md`
// matches every file under it, so new files are covered without config edits.
const matchers = config.allowedFiles.map((f) => ({
  entry: f,
  isMatch: picomatch(f.path, { dot: true }),
}));

/** The raw allowlist patterns, for display in the assistant's system prompt. */
export function allowedPatterns(): string[] {
  return config.allowedFiles.map((f) => f.path);
}

/** The allowlist entry whose pattern matches `path`, if any. */
export function matchingEntry(path: string) {
  return matchers.find((m) => m.isMatch(path))?.entry;
}

export function isReadable(path: string): boolean {
  return matchers.some((m) => m.isMatch(path));
}

export const isWritable = isReadable;

export function isImagePath(path: string): boolean {
  const dir = config.imageUploadDir.replace(/\/$/, '');
  const escaped = dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}/[a-z0-9][a-z0-9_-]{0,60}\\.webp$`, 'i').test(path);
}

export function isFieldEditAllowed(
  path: string,
  oldText: string,
  newText: string,
): { ok: boolean; reason?: string } {
  const entry = matchingEntry(path);
  if (!entry) return { ok: false, reason: `${path} is not in allowedFiles.` };
  if (!entry.allowedFields) return { ok: true }; // full-file editable

  const mentioned = entry.allowedFields.some(
    (field) => oldText.includes(field) || newText.includes(field),
  );
  if (!mentioned) {
    return {
      ok: false,
      reason: `Edits to ${path} must touch one of: ${entry.allowedFields.join(', ')}.`,
    };
  }
  return { ok: true };
}
