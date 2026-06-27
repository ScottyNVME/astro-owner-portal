import { describe, it, expect, vi } from 'vitest';

// Mock the virtual config module the allowlist reads at import time.
vi.mock('virtual:owner-portal/config', () => ({
  default: {
    allowedFiles: [
      { path: 'src/data/practice.ts', allowedFields: ['hours', 'phone'] },
      { path: 'src/content/**/*.md' },
    ],
    imageUploadDir: 'public/img/uploads',
  },
}));

const { isReadable, isWritable, matchingEntry, isImagePath, isFieldEditAllowed, allowedPatterns } =
  await import('../src/lib/allowlist');

describe('isReadable / isWritable (exact + glob)', () => {
  it('matches an exact path', () => {
    expect(isReadable('src/data/practice.ts')).toBe(true);
    expect(isWritable('src/data/practice.ts')).toBe(true);
  });

  it('matches files under a glob', () => {
    expect(isReadable('src/content/conditions/low-back-pain.md')).toBe(true);
    expect(isReadable('src/content/articles/first-visit.md')).toBe(true);
  });

  it('rejects paths outside the allowlist', () => {
    expect(isReadable('src/pages/index.astro')).toBe(false);
    expect(isReadable('src/data/internal/pricing.ts')).toBe(false);
    expect(isReadable('src/content/conditions/note.txt')).toBe(false);
  });
});

describe('matchingEntry', () => {
  it('returns the entry with its allowedFields for a data file', () => {
    expect(matchingEntry('src/data/practice.ts')?.allowedFields).toEqual(['hours', 'phone']);
  });
  it('returns a glob entry without allowedFields', () => {
    expect(matchingEntry('src/content/x.md')?.allowedFields).toBeUndefined();
  });
  it('returns undefined for an unmatched path', () => {
    expect(matchingEntry('nope.ts')).toBeUndefined();
  });
});

describe('isImagePath', () => {
  it('accepts a webp under the upload dir', () => {
    expect(isImagePath('public/img/uploads/photo-ab12.webp')).toBe(true);
  });
  it('rejects non-webp or wrong dir', () => {
    expect(isImagePath('public/img/uploads/photo.png')).toBe(false);
    expect(isImagePath('public/other/photo.webp')).toBe(false);
  });
});

describe('isFieldEditAllowed', () => {
  it('allows an edit that touches a whitelisted field', () => {
    expect(isFieldEditAllowed('src/data/practice.ts', 'hours: "9-5"', 'hours: "9-4"').ok).toBe(true);
  });
  it('blocks an edit that touches no whitelisted field', () => {
    const r = isFieldEditAllowed('src/data/practice.ts', 'tagline: "x"', 'tagline: "y"');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/hours/);
  });
  it('allows any edit to a fully-editable (no allowedFields) entry', () => {
    expect(isFieldEditAllowed('src/content/a.md', 'anything', 'else').ok).toBe(true);
  });
  it('blocks an unmatched path', () => {
    expect(isFieldEditAllowed('nope.ts', 'a', 'b').ok).toBe(false);
  });
});

describe('allowedPatterns', () => {
  it('returns the raw patterns', () => {
    expect(allowedPatterns()).toEqual(['src/data/practice.ts', 'src/content/**/*.md']);
  });
});
