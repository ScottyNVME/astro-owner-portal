import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
import { validateAndResolve, type OwnerPortalOptions } from './config.js';
import { ownerPortalConfigPlugin } from './virtual.js';

const routeUrl = (rel: string) => new URL(`./routes/${rel}`, import.meta.url);

const ROUTE_FILES = [
  { sub: '', file: 'login.astro' },
  { sub: '/chat', file: 'chat.astro' },
  { sub: '/api/auth', file: 'api/auth.ts' },
  { sub: '/api/chat', file: 'api/chat.ts' },
  { sub: '/api/commit', file: 'api/commit.ts' },
  { sub: '/api/publish', file: 'api/publish.ts' },
  { sub: '/api/discard', file: 'api/discard.ts' },
  { sub: '/api/upload', file: 'api/upload.ts' },
];

export default function ownerPortal(rawOptions: OwnerPortalOptions): AstroIntegration {
  const options = validateAndResolve(rawOptions);

  return {
    name: '@scottynvme/owner-portal',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig, logger }) => {
        updateConfig({
          vite: {
            plugins: [ownerPortalConfigPlugin(options)],
          },
        });

        for (const { sub, file } of ROUTE_FILES) {
          injectRoute({
            pattern: `${options.adminPath}${sub}`,
            entrypoint: fileURLToPath(routeUrl(file)),
            prerender: false,
          });
        }

        logger.info(
          `mounted at ${options.adminPath} (${ROUTE_FILES.length} routes) for brand "${options.brand.name}"`,
        );
      },
    },
  };
}

export type { OwnerPortalOptions, AllowedFile, BrandConfig } from './config.js';
