#!/usr/bin/env bash
# Roll one client site forward to a tagged release of @scottynvme/owner-portal.
#
# This is the exact script the Rollout workflow runs per client. It is also
# runnable locally against a scratch clone, with DRY_RUN=1, so the logic that
# touches client repos can be exercised before a real release ever fires.
#
# Inputs (environment):
#   PORTAL_REF    tag to roll out, e.g. v0.2.3                       (required)
#   CLIENT_DIR    path to a checked-out clone of the client site     (required)
#   CLIENT_BRANCH branch to push to                                  (default: main)
#   PORTAL_REPO   GitHub owner/name of the portal                    (default: scottynvme/astro-owner-portal)
#   DRY_RUN       1 = do everything except push                      (default: 0)
#   GIT_USER_NAME / GIT_USER_EMAIL  identity for the rollout commit   (required)
#                 Must be a real GitHub account that is a member of the Vercel
#                 team, or Vercel refuses to build the commit.
#   GITHUB_OUTPUT if set (GitHub Actions), result lines are appended for the job summary
#
# Exit codes: 0 = updated, already current, or not a portal client (skipped);
#             non-zero = something went wrong and nothing was pushed.
set -euo pipefail

: "${PORTAL_REF:?PORTAL_REF is required (e.g. v0.2.3)}"
: "${CLIENT_DIR:?CLIENT_DIR is required}"
CLIENT_BRANCH="${CLIENT_BRANCH:-main}"
PORTAL_REPO="${PORTAL_REPO:-scottynvme/astro-owner-portal}"
DRY_RUN="${DRY_RUN:-0}"
PKG='@scottynvme/owner-portal'
SPEC="github:${PORTAL_REPO}#${PORTAL_REF}"
EXPECTED_VERSION="${PORTAL_REF#v}"

out() { # key=value for the workflow, plus a readable log line
  echo "$1=$2"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$1=$2" >> "$GITHUB_OUTPUT"; fi
}

cd "$CLIENT_DIR"

# 1. Only touch sites that actually use the portal.
if ! node -e "const p=require('./package.json');const d={...(p.dependencies||{}),...(p.devDependencies||{})};process.exit(d['$PKG']?0:1)"; then
  echo "::warning::$PKG is not a dependency of this site; skipping"
  out result skipped-not-a-client
  exit 0
fi

before="$(node -p "const p=require('./package.json');(p.dependencies||{})['$PKG']||(p.devDependencies||{})['$PKG']")"
echo "current spec: $before"
echo "target spec:  $SPEC"

# 2. Install the tagged release. npm rewrites package.json + package-lock.json
#    to the tag's exact commit, and runs the package's prepare build.
npm install "$SPEC" --no-audit --no-fund --loglevel=error

# 3. Prove the installed code is the release we asked for.
installed="$(node -p "require('./node_modules/$PKG/package.json').version")"
if [ "$installed" != "$EXPECTED_VERSION" ]; then
  echo "::error::installed $PKG@$installed but tag $PORTAL_REF implies $EXPECTED_VERSION"
  exit 1
fi
echo "installed $PKG@$installed"

# 4. Nothing to do if the lockfile already pointed at this release.
if git diff --quiet HEAD -- package.json package-lock.json; then
  echo "already on $PORTAL_REF; nothing to commit"
  out result already-current
  exit 0
fi

# 5. Pre-flight: the site must still build with the new portal before we push.
#    The placeholder env values make sites that only mount the portal when
#    credentials exist (a common pattern) mount it for this build, so the
#    portal's own routes are compiled and checked. They never leave this job.
if node -e "process.exit(require('./package.json').scripts?.build?0:1)"; then
  echo "pre-flight build with $PKG@$installed"
  ADMIN_PASSWORD_HASH="${ADMIN_PASSWORD_HASH:-rollout-preflight}" \
  JWT_SECRET="${JWT_SECRET:-rollout-preflight}" \
  ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-rollout-preflight}" \
  GITHUB_TOKEN="${GITHUB_TOKEN:-rollout-preflight}" \
  GITHUB_REPO="${GITHUB_REPO:-rollout/preflight}" \
    npm run build --silent
  echo "pre-flight build passed"
else
  echo "no build script; skipping pre-flight build"
fi

# 6. Commit only the dependency change. Anything else in the tree is not ours.
: "${GIT_USER_NAME:?GIT_USER_NAME is required (a real GitHub login; Vercel rejects unknown authors)}"
: "${GIT_USER_EMAIL:?GIT_USER_EMAIL is required (the users.noreply.github.com address of that account)}"
git config user.name "$GIT_USER_NAME"
git config user.email "$GIT_USER_EMAIL"
git add package.json package-lock.json
git commit -q -m "Owner portal ${PORTAL_REF}" \
  -m "Automated rollout of ${PKG}@${installed} from ${PORTAL_REPO}."
sha="$(git rev-parse --short HEAD)"
git show --stat --oneline HEAD | head -5

if [ "$DRY_RUN" = "1" ]; then
  echo "DRY_RUN=1: not pushing commit $sha"
  out result dry-run
  out sha "$sha"
  exit 0
fi

# 7. Push, tolerating a branch that moved while we worked (the portal itself
#    commits to the owner's main, so this is a real race, not a hypothetical).
for attempt in 1 2 3; do
  if git pull --rebase --quiet origin "$CLIENT_BRANCH" && git push --quiet origin "HEAD:$CLIENT_BRANCH"; then
    sha="$(git rev-parse --short HEAD)"
    echo "pushed $sha to $CLIENT_BRANCH"
    out result updated
    out sha "$sha"
    exit 0
  fi
  echo "push attempt $attempt failed; retrying"
  sleep 5
done

echo "::error::could not push to $CLIENT_BRANCH after 3 attempts"
exit 1
