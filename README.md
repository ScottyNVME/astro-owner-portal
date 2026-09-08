# @scottynvme/owner-portal

An Astro integration that adds a Claude-powered "owner portal" to a static site. The site owner signs in at a private URL, types changes in plain English ("update Friday hours to 9–5", "change the homepage headline"), Claude proposes a precise edit, the owner approves the diff, and it goes live, with one-click undo. Server-side allowlists prevent edits outside a configured scope.

Designed for: a freelance web consultant who builds simple sites for small businesses and wants those clients to self-serve content changes — without giving them code, a CMS, or a learning curve.

- One `npm install`, ~15 lines of config — no client-side runtime, no CMS, no database.
- Per-site scope (allowed files + per-field whitelist) declared at integration time.
- Approve-the-diff-then-live, with one-click undo. No preview deploys to manage.
- Image uploads (drag-drop) auto-resized to WebP and committed alongside text edits.

## Install

```sh
# from npm (once published — preferred: prebuilt, reproducible, zero-auth)
npm install @scottynvme/owner-portal

# or straight from a git tag (no npm publish needed; npm runs the prepare build on install)
npm install github:scottynvme/astro-owner-portal#v0.2.0
```

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
      adminPath: '/studio',
      brand: {
        name: 'Example Business',
        logo: '/img/logo.png',
        accentColor: '#475569',
      },
      allowedFiles: [
        { path: 'src/data/content.ts' },
        { path: 'src/data/site.ts', allowedFields: ['hours', 'hoursDisplay', 'phones'] },
      ],
      imageUploadDir: 'public/img/uploads',
      productionDomain: 'www.example.com',
      contactInfo: 'Text the site owner',
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

Optional (for durable login rate-limiting across serverless instances — recommended for an internet-exposed admin). Without these, rate-limiting falls back to in-memory (per function instance):
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV's `KV_REST_API_URL` / `KV_REST_API_TOKEN`)

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
| `brand.accentColor` | `string` | `#475569` | Any CSS color. `--op-accent-dark` derived via `color-mix` |
| `brand.themeCss` | `string` | undefined | Site-rooted path to an extra CSS file `<link>`'d after defaults |
| `allowedFiles` | `AllowedFile[]` | (required) | `[{ path, allowedFields? }]`. Without `allowedFields`, the file is fully editable. With it, edits must touch at least one named field |
| `imageUploadDir` | `string` | (required) | e.g. `'public/img/uploads'`. Where uploads commit |
| `imageMaxWidth` | `number` | `1200` | sharp resize cap |
| `systemPromptExtra` | `string` | `''` | Appended to the base system prompt. Describe your data shapes here |
| `welcomeHint` | `string` | generic line | Plain-English note shown to the owner on the chat welcome card about what they can change |
| `productionDomain` | `string` | (required) | Shown to the owner in the "Change is live, updates in ~30s" status |
| `contactInfo` | `string` | (required) | Shown on the budget-exhausted card ("Text Scott", "Email support@…") |
| `model` | `string` | `'claude-sonnet-4-6'` | Any Anthropic model id |

## Brand theming

The package ships a vanilla-CSS theme using `--op-*` variables. The simplest brand customization is `brand.accentColor`, which becomes `--op-accent` (and `--op-accent-dark` via `color-mix`).

For larger overrides, set `brand.themeCss` to a site-rooted path. Place the file in your host's `public/` directory. Example:

```ts
brand: {
  name: 'Example Business',
  logo: '/img/logo.png',
  accentColor: '#475569',
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

End-to-end recipe in [examples/minimal/README.md](examples/minimal/README.md). Short version: push the host site to GitHub, import the repo in Vercel, set the five env vars above. The Vercel adapter generates a single `_render.func` serverless function for all owner-portal routes; the rest of your site stays static.

## Rolling a release out to every client

Client sites pin the portal to a git tag, so they never change until you say so. Saying so is one command.

1. Bump `version` in `package.json`, add a `CHANGELOG.md` entry, commit to `main`.
2. Tag that commit and push the tag:

   ```sh
   git tag v0.2.4 && git push origin v0.2.4
   ```

The **Rollout to clients** workflow (`.github/workflows/rollout.yml`) then runs `scripts/rollout-client.sh` against every site in `clients.json`: it installs the tag, checks the installed version matches, builds the site as a pre-flight, commits `package.json` + `package-lock.json`, and pushes. Vercel redeploys each site from that commit. The Actions summary lists every client with `updated`, `already-current`, or `failed`, and the run goes red if any client did not update (the ones that did are already live).

- **Add a client:** one entry in `clients.json` (`name`, `repo`, `branch`). The rollout token must be able to write to it.
- **Secret:** `ROLLOUT_TOKEN`, a fine-grained GitHub PAT with *Contents: read & write* (and *Metadata: read*) on each client repo. Set it once under the portal repo's Settings → Secrets and variables → Actions.
- **Guard rails:** the tag must equal the package version or nothing runs; a client whose build fails with the new release is not pushed; concurrent rollouts queue rather than overlap; a push that races an owner's own portal commit is retried on top of it.
- **By hand:** Actions → Rollout to clients → Run workflow lets you re-run a tag, target one client (`only`), or do a `dry_run` that stops before pushing.
- **Verify from outside:** `GET /studio/api/health` returns `{ "ok": true, "version": "0.2.4" }`, and the login page carries `<meta name="generator" content="owner-portal 0.2.4">`.
- **Roll one client back:** `git revert` the rollout commit in that site. Nothing else is involved.

## How it works

1. Owner visits `${adminPath}` and signs in with the shared password. Server bcrypts, issues a 4-hour JWT in an `httpOnly` cookie.
2. Owner types a request. The server runs Claude with a tool-use loop:
   - `read_file(path)` — fetches the current file via the GitHub API.
   - `propose_edit(path, old_string, new_string, summary)` — returns a proposal record.
3. The proposal renders as a red/green diff. Owner reviews it and clicks **Apply**.
4. Server validates against the allowlist (path + optional per-field whitelist) and commits the edit **directly to `main`**. Vercel redeploys production (~30s).
5. A "Change is live" card offers **Undo this change** — one click commits a revert that restores the previous state (also live in ~30s). For a deeper rollback, use Vercel's Instant Rollback.

A build-breaking edit can't take the site down: Vercel won't promote a failing build, so production stays on the last good deploy. The in-chat diff is the review step (no separate preview deploy).

Image uploads work the same way: drag a photo into the chat → server resizes to WebP via `sharp` → commits to `main` → owner sees the new path and tells Claude where to use it.

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

The [examples/minimal](examples/minimal) directory is the smoke-test consumer. Build it with `npm run build` inside that directory; inspect `.vercel/output/` to see what Vercel will deploy.

## License

MIT — see [LICENSE](LICENSE).
