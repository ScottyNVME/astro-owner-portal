import { z } from 'zod';

// ───────────────────────────────────────────────────────────────────────────
// Public option types — this is the package's SemVer surface. Renaming a key
// here (or an env var, or an injected route) is a BREAKING change.
// ───────────────────────────────────────────────────────────────────────────

export type AllowedFile = {
  /** A file path OR a glob (e.g. `src/content/**\/*.md`). Globs match via picomatch. */
  path: string;
  allowedFields?: string[];
};

export type BrandConfig = {
  name: string;
  logo: string;
  accentColor?: string;
  themeCss?: string;
};

export type OwnerPortalOptions = {
  adminPath: string;
  brand: BrandConfig;
  allowedFiles: AllowedFile[];
  imageUploadDir: string;
  imageMaxWidth?: number;
  systemPromptExtra?: string;
  productionDomain: string;
  contactInfo: string;
  model?: string;
};

export type ResolvedOptions = Required<
  Pick<OwnerPortalOptions, 'adminPath' | 'imageUploadDir' | 'productionDomain' | 'contactInfo'>
> & {
  brand: Required<Pick<BrandConfig, 'name' | 'logo'>> & {
    accentColor: string;
    themeCss?: string;
  };
  allowedFiles: AllowedFile[];
  imageMaxWidth: number;
  systemPromptExtra: string;
  model: string;
};

export const DEFAULTS = {
  imageMaxWidth: 1200,
  model: 'claude-sonnet-4-6',
  accentColor: '#475569', // neutral slate; override per-site via brand.accentColor
} as const;

export class OwnerPortalConfigError extends Error {
  constructor(message: string) {
    super(`[owner-portal] ${message}`);
    this.name = 'OwnerPortalConfigError';
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Validation (zod). The resolved object is JSON-serialized into a virtual
// module, so it must stay a plain, serializable value (it does).
// ───────────────────────────────────────────────────────────────────────────

const allowedFileSchema = z.object({
  path: z.string().min(1, 'each allowedFiles entry needs a non-empty `path` (a file path or glob)'),
  allowedFields: z.array(z.string()).min(1).optional(),
});

const brandSchema = z.object({
  name: z.string().min(1, 'brand.name is required'),
  logo: z.string().min(1, 'brand.logo is required (URL or site-rooted path)'),
  accentColor: z.string().optional(),
  themeCss: z.string().optional(),
});

const optionsSchema = z.object({
  adminPath: z
    .string()
    .startsWith('/', 'adminPath must start with "/" (e.g. "/studio")')
    .refine((p) => p === '/' || !p.endsWith('/'), 'adminPath must not end with "/"'),
  brand: brandSchema,
  allowedFiles: z.array(allowedFileSchema).min(1, 'allowedFiles must be a non-empty array'),
  imageUploadDir: z.string().min(1, 'imageUploadDir is required (e.g. "public/img/uploads")'),
  imageMaxWidth: z.number().int().positive().optional(),
  systemPromptExtra: z.string().optional(),
  productionDomain: z.string().min(1, 'productionDomain is required (e.g. "www.example.com")'),
  contactInfo: z.string().min(1, 'contactInfo is required (shown to the owner on error cards)'),
  model: z.string().min(1).optional(),
});

export function validateAndResolve(input: OwnerPortalOptions): ResolvedOptions {
  const parsed = optionsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new OwnerPortalConfigError(`${where}${issue?.message ?? 'invalid options'}`);
  }
  const o = parsed.data;
  return {
    adminPath: o.adminPath,
    brand: {
      name: o.brand.name,
      logo: o.brand.logo,
      accentColor: o.brand.accentColor ?? DEFAULTS.accentColor,
      themeCss: o.brand.themeCss,
    },
    allowedFiles: o.allowedFiles.map((f) => ({ path: f.path, allowedFields: f.allowedFields })),
    imageUploadDir: o.imageUploadDir,
    imageMaxWidth: o.imageMaxWidth ?? DEFAULTS.imageMaxWidth,
    systemPromptExtra: o.systemPromptExtra ?? '',
    productionDomain: o.productionDomain,
    contactInfo: o.contactInfo,
    model: o.model ?? DEFAULTS.model,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Authoring DX helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Identity helper that gives editor autocomplete + inline type-checking when
 * authoring options. Optional sugar — `ownerPortal({...})` accepts a raw object
 * too.
 */
export function defineOwnerPortalConfig(options: OwnerPortalOptions): OwnerPortalOptions {
  return options;
}

/**
 * Reusable allowlist presets for common site shapes, so each client config is
 * a few lines instead of a hand-rolled file list. Spread the result into your
 * options: `...presets.astroContentSite({ data, content })`.
 */
export const presets = {
  /**
   * A typical Astro content-collection site: structured data file(s) plus
   * markdown/MDX content (and optionally page templates), expressed as paths or
   * globs. `data` entries accept a per-field whitelist; `content` entries are
   * fully editable.
   */
  astroContentSite(opts: {
    data?: Array<string | AllowedFile>;
    content?: string[];
  }): { allowedFiles: AllowedFile[] } {
    const data: AllowedFile[] = (opts.data ?? []).map((d) =>
      typeof d === 'string' ? { path: d } : d,
    );
    const content: AllowedFile[] = (opts.content ?? []).map((p) => ({ path: p }));
    return { allowedFiles: [...data, ...content] };
  },
};
