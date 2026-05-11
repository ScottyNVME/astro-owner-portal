# Changelog

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
