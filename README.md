# @scottynvme/owner-portal

An Astro integration that adds a Claude-powered "owner portal" to a static site. The site owner signs in at a private URL, types changes in plain English ("change carnitas to $16", "update Friday hours to 11–10"), Claude proposes a precise edit, the owner approves on a Vercel preview, and clicks **Make it live** to merge to `main`. Server-side allowlists prevent edits outside a configured scope.

Designed for: a freelance web consultant who builds simple sites for small businesses and wants those clients to self-serve content changes — without giving them code, a CMS, or a learning curve.

- One `npm install`, ~15 lines of config — no client-side runtime, no CMS, no database.
- Per-site scope (allowed files + per-field whitelist) declared at integration time.
- Preview-then-publish flow with predictable Vercel preview URLs.
- Image uploads (drag-drop) auto-resized to WebP and committed alongside text edits.

## Install

```sh
npm install github:scottynvme/astro-owner-portal#v0.1.0
```

`npm` will clone the tag and run a `prepare` build automatically. No registry, no token, no npm publishing.

## Configure

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import ownerPortal from '@scottynvme/owner-portal';

export default defineConfig({
  output: 'static',
  adapter: vercel(),
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
        { path: 'src/data/restaurant.ts', allowedFields: ['hours', 'hoursDisplay', 'phones'] },
      ],
      imageUploadDir: 'public/img/food',
      productionDomain: 'www.mibellailucion.com',
      contactInfo: 'Text Scott',
      systemPromptExtra: '…describe your data shapes to Claude here…',
    }),
  ],
});
```

The integration auto-injects 8 routes under `${adminPath}`: login, chat, and 6 API endpoints. Your host site's other routes are untouched.

## Required environment variables

Set these in each client's Vercel project (Settings → Environment Variables). They are NOT baked into the package and never leave the server.

| Name | Notes |
|---|---|
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the owner's password |
| `JWT_SECRET` | 32 random bytes, base64. Used to sign the session cookie |
| `ANTHROPIC_API_KEY` | from `console.anthropic.com`. **Set a monthly spend cap** to bound cost |
| `GITHUB_TOKEN` | fine-grained PAT, **Contents: read & write** on the client's repo only |
| `GITHUB_REPO` | `owner/repo` — the GitHub repo Vercel deploys from |

Optional (auto-detected on Vercel from system env vars; override only if the auto-detect is wrong):
- `VERCEL_PROJECT_NAME`
- `VERCEL_SCOPE_SLUG`

### Generating the credentials

```sh
# bcrypt hash for the owner's password
node --input-type=module -e "import b from 'bcryptjs'; console.log(b.hashSync(process.argv[1], 10))" 'their-password'

# 32-byte JWT secret, base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Config reference

| Option | Type | Default | Description |
|---|---|---|---|
| `adminPath` | `string` | (required) | Path the portal mounts at. Must start with `/`, no trailing slash |
| `brand.name` | `string` | (required) | Shown in page title and chat header |
| `brand.logo` | `string` | (required) | Site-rooted path or absolute URL |
| `brand.accentColor` | `string` | `#c0532b` | Any CSS color. `--op-accent-dark` derived via `color-mix` |
| `brand.themeCss` | `string` | undefined | Site-rooted path to an extra CSS file `<link>`'d after defaults |
| `allowedFiles` | `AllowedFile[]` | (required) | `[{ path, allowedFields? }]`. Without `allowedFields`, the file is fully editable. With it, edits must touch at least one named field |
| `imageUploadDir` | `string` | (required) | e.g. `'public/img/food'`. Where uploads commit |
| `imageMaxWidth` | `number` | `1200` | sharp resize cap |
| `systemPromptExtra` | `string` | `''` | Appended to the base system prompt. Describe your data shapes here |
| `branchPrefix` | `string` | `'owner-edit'` | Branch names are `{prefix}-{YYYYMMDD-HHMMSS}` UTC |
| `productionDomain` | `string` | (required) | Shown to the owner in the "Published, updates in ~30s" status |
| `contactInfo` | `string` | (required) | Shown on the budget-exhausted card ("Text Scott", "Email support@…") |
| `model` | `string` | `'claude-sonnet-4-6'` | Any Anthropic model id |

## Brand theming

The package ships a vanilla-CSS theme using `--op-*` variables. The simplest brand customization is `brand.accentColor`, which becomes `--op-accent` (and `--op-accent-dark` via `color-mix`).

For larger overrides, set `brand.themeCss` to a site-rooted path. Place the file in your host's `public/` directory. Example:

```ts
brand: {
  name: 'Mi Bella Ilución',
  logo: '/img/decor/logo.jpg',
  accentColor: '#c0532b',
  themeCss: '/owner-portal-theme.css',
},
```

```css
/* public/owner-portal-theme.css */
:root {
  --op-bg: #fbf6ec;
  --op-text: #2a1a10;
  --op-font-display: 'Fraunces', Georgia, serif;
}
```

All `--op-*` variable names are defined in [src/styles/theme.css](src/styles/theme.css).

## Local development

`.env` files do **not** populate `process.env` for server-side reads in Astro dev. Export env vars in your shell or use `dotenv-cli`:

```sh
ADMIN_PASSWORD_HASH='$2b$10$...' \
JWT_SECRET='base64-secret' \
ANTHROPIC_API_KEY='sk-ant-...' \
GITHUB_TOKEN='ghp_...' \
GITHUB_REPO='owner/repo' \
  npm run dev
```

On Vercel, project env vars land in `process.env` automatically.

## Deploy to Vercel

End-to-end recipe in [examples/minimal-restaurant/README.md](examples/minimal-restaurant/README.md). Short version: push the host site to GitHub, import the repo in Vercel, set the five env vars above. The Vercel adapter generates a single `_render.func` serverless function for all owner-portal routes; the rest of your site stays static.

## How it works

1. Owner visits `${adminPath}` and signs in with the shared password. Server bcrypts, issues a 4-hour JWT in an `httpOnly` cookie.
2. Owner types a request. The server runs Claude with a tool-use loop:
   - `read_file(path)` — fetches the current file via the GitHub API.
   - `propose_edit(path, old_string, new_string, summary)` — returns a proposal record.
3. The proposal renders as a red/green diff. Owner clicks **Apply**.
4. Server validates against the allowlist, then commits the edit to a draft branch `{branchPrefix}-{UTC-timestamp}`.
5. Vercel auto-builds a preview at the predictable branch URL. Owner clicks **Open preview**, then **Make it live**.
6. Server merges the branch into `main` and deletes it. Vercel redeploys production. Done.

Image uploads work the same way: drag a photo into the chat → server resizes to WebP via `sharp` → commits to the same draft branch → owner sees the new path and tells Claude where to use it.

## Security

- Single shared password per site. No user accounts. Good enough for the one owner; not designed for multi-user.
- bcrypt for the password, JWT in an `httpOnly` + `secure` + `sameSite=lax` cookie.
- IP-based rate limit: 5 failed logins per 15 min, in-memory.
- Even if Claude is prompt-injected, the server-side allowlist (file paths + optional per-field whitelist + image-path regex) is the source of truth. Claude cannot bypass it.
- The `GITHUB_TOKEN` should be a **fine-grained PAT**, scoped to a single repo, with **Contents: read & write** only.

## Cost

Anthropic spend is metered per call. With Sonnet at typical usage (~5 owner messages/week per site), expect well under a dollar per site per month. The integration recognizes the Anthropic billing/cap error and renders a clear "monthly budget reached, resets on X" card — set a hard monthly cap on your API key.

## Development

```sh
npm install
npm run build       # tsup + copy routes/styles/lib to dist/
npm run typecheck
npm run dev         # tsup --watch (for iterating on the integration itself)
```

The [examples/minimal-restaurant](examples/minimal-restaurant) directory is the smoke-test consumer. Build it with `npm run build` inside that directory; inspect `.vercel/output/` to see what Vercel will deploy.

## License

MIT — see [LICENSE](LICENSE).
