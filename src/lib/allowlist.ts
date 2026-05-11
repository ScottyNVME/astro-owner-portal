import config from 'virtual:owner-portal/config';

export function isReadable(path: string): boolean {
  return config.allowedFiles.some((f) => f.path === path);
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
  const entry = config.allowedFiles.find((f) => f.path === path);
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
