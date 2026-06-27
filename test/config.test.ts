import { describe, it, expect } from 'vitest';
import {
  validateAndResolve,
  defineOwnerPortalConfig,
  presets,
  OwnerPortalConfigError,
  DEFAULTS,
  type OwnerPortalOptions,
} from '../src/config';

const base: OwnerPortalOptions = {
  adminPath: '/studio',
  brand: { name: 'Acme', logo: '/logo.png' },
  allowedFiles: [{ path: 'src/data/site.ts' }],
  imageUploadDir: 'public/img/uploads',
  productionDomain: 'www.acme.com',
  contactInfo: 'Text us',
};

describe('validateAndResolve', () => {
  it('resolves a valid config and applies defaults', () => {
    const r = validateAndResolve(base);
    expect(r.adminPath).toBe('/studio');
    expect(r.brand.accentColor).toBe(DEFAULTS.accentColor);
    expect(r.imageMaxWidth).toBe(DEFAULTS.imageMaxWidth);
    expect(r.model).toBe(DEFAULTS.model);
    expect(r.systemPromptExtra).toBe('');
  });

  it('keeps explicit overrides', () => {
    const r = validateAndResolve({ ...base, model: 'claude-opus-4-8', imageMaxWidth: 1600 });
    expect(r.model).toBe('claude-opus-4-8');
    expect(r.imageMaxWidth).toBe(1600);
  });

  it('rejects an adminPath without a leading slash', () => {
    expect(() => validateAndResolve({ ...base, adminPath: 'studio' })).toThrow(OwnerPortalConfigError);
  });

  it('rejects an adminPath with a trailing slash', () => {
    expect(() => validateAndResolve({ ...base, adminPath: '/studio/' })).toThrow(/must not end with/);
  });

  it('requires brand.name', () => {
    expect(() =>
      validateAndResolve({ ...base, brand: { name: '', logo: '/l.png' } }),
    ).toThrow(/brand\.name/);
  });

  it('requires a non-empty allowedFiles array', () => {
    expect(() => validateAndResolve({ ...base, allowedFiles: [] })).toThrow(/allowedFiles/);
  });

  it('requires productionDomain', () => {
    expect(() =>
      validateAndResolve({ ...base, productionDomain: '' }),
    ).toThrow(/productionDomain/);
  });
});

describe('defineOwnerPortalConfig', () => {
  it('returns the same options object (identity helper)', () => {
    expect(defineOwnerPortalConfig(base)).toEqual(base);
  });
});

describe('presets.astroContentSite', () => {
  it('expands data + content into allowedFiles', () => {
    const { allowedFiles } = presets.astroContentSite({
      data: ['src/data/site.ts', { path: 'src/data/x.ts', allowedFields: ['hours'] }],
      content: ['src/content/**/*.md'],
    });
    expect(allowedFiles).toEqual([
      { path: 'src/data/site.ts' },
      { path: 'src/data/x.ts', allowedFields: ['hours'] },
      { path: 'src/content/**/*.md' },
    ]);
  });

  it('handles empty input', () => {
    expect(presets.astroContentSite({}).allowedFiles).toEqual([]);
  });
});

describe('SemVer surface (contract)', () => {
  it('resolved options expose the documented keys', () => {
    const r = validateAndResolve(base);
    expect(Object.keys(r).sort()).toEqual(
      [
        'adminPath',
        'allowedFiles',
        'brand',
        'contactInfo',
        'imageMaxWidth',
        'imageUploadDir',
        'model',
        'productionDomain',
        'systemPromptExtra',
      ].sort(),
    );
  });
});
