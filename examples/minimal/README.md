# minimal — owner-portal smoke test

The smallest domain-agnostic consumer of `@scottynvme/owner-portal`. Used to verify the integration builds and mounts its routes.

```sh
npm install
npm run build          # inspect .vercel/output/ to see what Vercel deploys
```

The portal mounts at `/studio` (login + chat + 6 API routes). The rest of the site (`/`) stays static.

## Deploy to Vercel (recipe for any client site)

1. Push this site to a GitHub repo.
2. Import the repo in Vercel.
3. Set the required environment variables (Vercel → Settings → Environment Variables):

   | Name | Notes |
   |---|---|
   | `ADMIN_PASSWORD_HASH` | bcrypt hash of the owner's password |
   | `JWT_SECRET` | 32 random bytes, base64 |
   | `ANTHROPIC_API_KEY` | from console.anthropic.com — set a monthly spend cap |
   | `GITHUB_TOKEN` | fine-grained PAT, Contents: read & write, this repo only |
   | `GITHUB_REPO` | `owner/repo` Vercel deploys from |

4. Visit `/studio`, sign in, and try: "update Friday hours to 9–4".
