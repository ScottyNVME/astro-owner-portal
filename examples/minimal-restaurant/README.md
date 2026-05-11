# minimal-restaurant

A reference Astro app that consumes `@scottynvme/owner-portal` end-to-end. Use this as a template when wiring up a new client site.

## What's here

- `astro.config.mjs` — the canonical integration config. Two files are made editable; `restaurant.ts` has a per-field whitelist on `hours`, `hoursDisplay`, and `phones`.
- `src/data/menu.ts` + `src/data/restaurant.ts` — sample data with the shapes the owner portal expects to edit.
- `src/pages/index.astro` — a tiny homepage that renders the data so edits are visible.
- The owner portal mounts at `/pascual` (login + chat + 6 API routes) from the integration.

## Run locally

The package depends on the parent integration via `file:../..`. The integration's `prepare` build runs on install.

```sh
npm install
```

Astro's `.env` does **not** populate `process.env` for our server-side env reads. Export the values in your shell or use `dotenv-cli`. To generate the bcrypt hash and JWT secret:

```sh
# bcrypt hash for your chosen password (replace test123)
node --input-type=module -e "import b from 'bcryptjs'; console.log(b.hashSync('test123', 10))"

# 32-byte JWT secret, base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then:

```sh
ADMIN_PASSWORD_HASH='$2b$10$...' \
JWT_SECRET='base64-secret' \
ANTHROPIC_API_KEY='sk-ant-...' \
GITHUB_TOKEN='ghp_...' \
GITHUB_REPO='your-username/your-repo' \
  npm run dev
```

Visit `http://localhost:4321/` for the public site, `http://localhost:4321/pascual` for the owner portal.

## Deploy to Vercel

1. Push this directory to its own GitHub repo (e.g. `your-username/example-restaurant`). The repo's `main` branch is what the owner portal will commit edits to.
2. In Vercel, **Add New… → Project**, import the GitHub repo, accept the Astro framework preset.
3. Set environment variables in the Vercel project (Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `ADMIN_PASSWORD_HASH` | the bcrypt hash from above |
   | `JWT_SECRET` | the base64 secret from above |
   | `ANTHROPIC_API_KEY` | your Anthropic API key |
   | `GITHUB_TOKEN` | fine-grained PAT, **Contents: read & write** on this repo only |
   | `GITHUB_REPO` | `your-username/example-restaurant` (must match the repo Vercel deploys from) |

   Optional: `VERCEL_PROJECT_NAME` and `VERCEL_SCOPE_SLUG` if the auto-detected preview URL doesn't match your actual Vercel project name / team slug.

4. Deploy. Visit `https://your-project.vercel.app/pascual` and sign in.

## Verifying the build locally produces Vercel output

```sh
npm run build
ls .vercel/output/
# expect: builds/, functions/, static/, config.json
ls .vercel/output/functions/
# expect: an .func directory per non-prerendered route (login, chat, api/auth, api/chat, ...)
```
