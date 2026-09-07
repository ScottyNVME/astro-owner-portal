# Changelog

## 0.2.2

- Fix `brand.accentColor` being ignored. Astro injects the bundled `theme.css` link after the inline accent rule, so the default slate `--op-accent` overrode the configured colour on both the login and chat pages. The inline rule now uses `:root:root` so the configured accent always wins.

## 0.2.1

- Replace the chat welcome card's raw allowlist dump (file paths + field names) with a friendly, non-technical line. New optional `welcomeHint` config string lets each site say in plain English what the owner can change; falls back to a generic friendly message.

## 0.2.0

Domain-agnostic, hardened release. The package no longer carries any restaurant-specific defaults, and the edit flow is simplified to commit-direct-to-live with one-click undo.

### Breaking changes
- **Removed the preview/publish/discard flow.** Approved edits now commit directly to `main` (Vercel redeploys in ~30s). The `/api/publish` and `/api/discard` routes are gone; a new **`/api/revert`** undoes the most recent change. A build-breaking edit can't take the site down — Vercel won't promote a failing build.
- **Removed the `branchPrefix` option** (no draft branches anymore).
- **Removed the optional `VERCEL_PROJECT_NAME` / `VERCEL_SCOPE_SLUG` env vars** (no preview-URL derivation needed).

### Features
- **Domain-neutral defaults** — neutral slate theme, generic `examples/minimal` (replaces `minimal-restaurant`).
- **zod-validated config** with clearer errors, plus `defineOwnerPortalConfig()` and `presets.astroContentSite()` authoring helpers.
- **Glob allowlists** — `allowedFiles[].path` accepts globs (e.g. `src/content/**/*.md`); a new `list_files` tool lets the assistant resolve them to concrete files.
- **Durable login rate-limit** via Upstash/Vercel-KV (`UPSTASH_REDIS_REST_URL`/`_TOKEN` or `KV_REST_API_URL`/`_TOKEN`), with in-memory fallback.
- **`/api/health`** readiness route + aggregated required-env check.
- Test suite (Vitest), CI + Changesets release workflows, npm provenance on publish.

## 0.1.0 — 2026-05-10

First release. Astro integration that mounts a Claude-powered owner-portal under a configurable `adminPath`. Extracted from the inline implementation in `ScottyNVME/baan-khun-restaurant` (Mi Bella Ilución).

### Features
- Drop-in install via `npm install github:scottynvme/astro-owner-portal#v0.1.0` — no registry needed; `prepare` builds on install.
- One config object in `astro.config.mjs` drives everything: per-site brand, allowed files (with optional per-field whitelist), image upload directory, branch prefix, model, system-prompt extras.
- 8 routes auto-injected under `${adminPath}`: login, chat, and 6 API endpoints (`auth`, `chat`, `commit`, `publish`, `discard`, `upload`).
- Auth: bcrypt password + JWT in `httpOnly` cookie, in-memory IP rate-limit.
- Tool-use chat with `read_file` and `propose_edit`. Friendly UI cards for proposals, previews, budget-exhausted, and rate-limited states.
- Image uploads via drag-drop: sharp resize to configured max width, WebP, committed to the draft branch alongside text edits.
- Server-side allowlist enforces path scope and optional per-field scope even if Claude is prompt-injected.
- Predictable Vercel preview URLs auto-derived from `GITHUB_REPO` + Vercel system env vars.
- Vanilla-CSS theme with `--op-*` variables. Brand accent color and optional full theme override flow from config.

### Stack constraints
- Astro `^6.0.0` (peer dep)
- Vercel adapter (any version with Vercel Build Output API support)
- Node `>=22.12.0`

### Known gotchas
- Astro dev mode does not populate `process.env` from `.env` files for server-side reads. Export env vars in shell or use `dotenv-cli`. Production on Vercel is unaffected.
