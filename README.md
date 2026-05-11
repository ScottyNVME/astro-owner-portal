# @scottynvme/owner-portal

An Astro integration that injects a Claude-powered "owner portal" into a static site, letting the site owner edit data files in natural language with a preview-then-publish flow.

> **Status: v0.1.0-dev** — Phase 3 complete. All routes (login, chat, 6 API endpoints) are functional. Phase 4 (deploy-test on Vercel) and Phase 5 (README polish + v0.1.0 tag) are next.

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

## Local development with the example app

```sh
cd examples/minimal-restaurant
npm install
ADMIN_PASSWORD_HASH='$2b$10$...your-bcrypt-hash...' \
JWT_SECRET='base64-of-32-random-bytes' \
ANTHROPIC_API_KEY='sk-...' \
GITHUB_TOKEN='ghp_...' \
GITHUB_REPO='owner/repo' \
  npm run dev
```

Astro's `.env` file loading does **not** populate `process.env` for server-side reads in dev. Either export the variables in your shell (as above) or use a tool like `dotenv-cli`. On Vercel, project env vars land in `process.env` automatically.

## Development

```sh
npm install
npm run build       # tsup + copy routes/styles to dist/
npm run typecheck
npm run dev         # tsup --watch
```
