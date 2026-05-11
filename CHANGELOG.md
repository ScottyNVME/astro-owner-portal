# Changelog

## 0.1.0-dev — unreleased

### Phase 3 (current)
- All 6 API endpoints functional: auth (bcrypt + JWT session), chat (Claude tool-use loop), commit (allowlist + GitHub commit), publish (merge to main + delete branch), discard (delete branch), upload (sharp resize + commit binary).
- login.astro and chat.astro fully ported with vanilla-CSS theme. Brand accent color flows from `config.brand.accentColor` through inline `<style>:root{--op-accent:…}</style>`. Optional `config.brand.themeCss` injected via `<link>` after defaults.
- Per-site values injected into client JS via Astro's `define:vars` (apiBase, productionDomain, contactInfo).
- End-to-end smoke-tested: real session flow with bcrypt-hashed password, cookie issue/read, route guards, allowlist enforcement, branch-name regex enforcement. Anthropic/GitHub errors surface at the right layer.

### Phase 2
- Libs ported (auth/claude/github/allowlist), parameterized via `virtual:owner-portal/config`. Cookie `op_session`. Allowlist whitelist-only (banlist dropped). System prompt = base + auto-listed scope + `systemPromptExtra`.

### Phase 1
- Astro integration plumbing: validates options, injects 8 routes under `${adminPath}`, exposes `virtual:owner-portal/config` via Vite plugin, tsup ESM + .d.ts build, `prepare`-based git-tag distribution.
