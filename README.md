# @scottynvme/owner-portal

An Astro integration that injects a Claude-powered "owner portal" into a static site, letting the site owner edit data files in natural language with a preview-then-publish flow.

> **Status: v0.1.0-dev** — Phase 1 (plumbing only). Routes are stubs. Real implementations land in Phase 2/3.

## Install

```sh
npm install github:scottynvme/astro-owner-portal#v0.1.0
```

## Configure

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import ownerPortal from '@scottynvme/owner-portal';

export default defineConfig({
  output: 'static',
  integrations: [
    ownerPortal({
      adminPath: '/pascual',
      brand: {
        name: 'Mi Bella Ilución',
        logo: '/img/decor/logo.jpg',
        accentColor: '#c0532b',
      },
      allowedFiles: [
        { path: 'src/data/menu.ts' },
        { path: 'src/data/restaurant.ts', allowedFields: ['hours', 'phones'] },
      ],
      imageUploadDir: 'public/img/food',
      systemPromptExtra: 'Domain-specific guidance for Claude…',
      productionDomain: 'www.example.com',
      contactInfo: 'Text Scott',
    }),
  ],
});
```

## Required environment variables (per client, set in their Vercel project)

- `ADMIN_PASSWORD_HASH` — bcrypt hash of the owner's password
- `JWT_SECRET` — 32 random bytes, base64
- `ANTHROPIC_API_KEY`
- `GITHUB_TOKEN` — fine-grained PAT, contents:write on the one repo
- `GITHUB_REPO` — `owner/repo`

Optional (auto-detected on Vercel; override if needed):
- `VERCEL_PROJECT_NAME`
- `VERCEL_SCOPE_SLUG`

## Development

```sh
npm install
npm run build       # tsup + copy routes/styles to dist/
npm run typecheck
npm run dev         # tsup --watch
```
