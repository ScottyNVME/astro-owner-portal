export type AllowedFile = {
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
  branchPrefix?: string;
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
  branchPrefix: string;
  model: string;
};

export const DEFAULTS = {
  imageMaxWidth: 1200,
  branchPrefix: 'owner-edit',
  model: 'claude-sonnet-4-6',
  accentColor: '#c0532b',
} as const;

export class OwnerPortalConfigError extends Error {
  constructor(message: string) {
    super(`[owner-portal] ${message}`);
    this.name = 'OwnerPortalConfigError';
  }
}

export function validateAndResolve(input: OwnerPortalOptions): ResolvedOptions {
  if (!input || typeof input !== 'object') {
    throw new OwnerPortalConfigError('options object is required');
  }
  const {
    adminPath,
    brand,
    allowedFiles,
    imageUploadDir,
    imageMaxWidth,
    systemPromptExtra,
    branchPrefix,
    productionDomain,
    contactInfo,
    model,
  } = input;

  if (typeof adminPath !== 'string' || !adminPath.startsWith('/')) {
    throw new OwnerPortalConfigError('adminPath must be a string starting with "/" (e.g. "/pascual")');
  }
  if (adminPath.length > 1 && adminPath.endsWith('/')) {
    throw new OwnerPortalConfigError(`adminPath must not end with "/" (got "${adminPath}")`);
  }

  if (!brand || typeof brand !== 'object') {
    throw new OwnerPortalConfigError('brand is required');
  }
  if (typeof brand.name !== 'string' || !brand.name) {
    throw new OwnerPortalConfigError('brand.name is required');
  }
  if (typeof brand.logo !== 'string' || !brand.logo) {
    throw new OwnerPortalConfigError('brand.logo is required (URL or site-rooted path)');
  }

  if (!Array.isArray(allowedFiles) || allowedFiles.length === 0) {
    throw new OwnerPortalConfigError('allowedFiles must be a non-empty array');
  }
  for (const f of allowedFiles) {
    if (!f || typeof f.path !== 'string' || !f.path) {
      throw new OwnerPortalConfigError('each allowedFiles entry must have a non-empty `path`');
    }
    if (f.allowedFields !== undefined) {
      if (!Array.isArray(f.allowedFields) || f.allowedFields.some((x) => typeof x !== 'string')) {
        throw new OwnerPortalConfigError(`allowedFields for ${f.path} must be string[]`);
      }
    }
  }

  if (typeof imageUploadDir !== 'string' || !imageUploadDir) {
    throw new OwnerPortalConfigError('imageUploadDir is required (e.g. "public/img/food")');
  }

  if (typeof productionDomain !== 'string' || !productionDomain) {
    throw new OwnerPortalConfigError('productionDomain is required (e.g. "www.example.com")');
  }

  if (typeof contactInfo !== 'string' || !contactInfo) {
    throw new OwnerPortalConfigError('contactInfo is required (shown to owner on error cards)');
  }

  return {
    adminPath,
    brand: {
      name: brand.name,
      logo: brand.logo,
      accentColor: brand.accentColor ?? DEFAULTS.accentColor,
      themeCss: brand.themeCss,
    },
    allowedFiles: allowedFiles.map((f) => ({
      path: f.path,
      allowedFields: f.allowedFields,
    })),
    imageUploadDir,
    imageMaxWidth: imageMaxWidth ?? DEFAULTS.imageMaxWidth,
    systemPromptExtra: systemPromptExtra ?? '',
    branchPrefix: branchPrefix ?? DEFAULTS.branchPrefix,
    productionDomain,
    contactInfo,
    model: model ?? DEFAULTS.model,
  };
}
