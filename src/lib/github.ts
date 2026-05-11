import { Octokit } from '@octokit/rest';
import config from 'virtual:owner-portal/config';

const BASE_BRANCH = 'main';

function env(name: string): string {
  const v = import.meta.env[name] ?? process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return String(v);
}

function envOpt(name: string): string | undefined {
  return import.meta.env[name] ?? process.env[name];
}

function getClient(): Octokit {
  return new Octokit({ auth: env('GITHUB_TOKEN') });
}

function repoParts(): { owner: string; repo: string } {
  const full = env('GITHUB_REPO');
  const [owner, repo] = full.split('/');
  if (!owner || !repo) throw new Error(`GITHUB_REPO must be "owner/repo", got "${full}"`);
  return { owner, repo };
}

export function generateBranchName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  return `${config.branchPrefix}-${stamp}`;
}

export function branchNamePattern(): RegExp {
  const prefix = config.branchPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${prefix}-\\d{8}-\\d{6}$`);
}

export async function readFile(path: string): Promise<string> {
  const oct = getClient();
  const { owner, repo } = repoParts();
  const { data } = await oct.repos.getContent({ owner, repo, path, ref: BASE_BRANCH });
  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error(`${path} is not a file`);
  }
  if (!data.content) throw new Error(`${path} has no content`);
  return Buffer.from(data.content, data.encoding as BufferEncoding).toString('utf-8');
}

async function getBaseSha(): Promise<string> {
  const oct = getClient();
  const { owner, repo } = repoParts();
  const { data } = await oct.git.getRef({ owner, repo, ref: `heads/${BASE_BRANCH}` });
  return data.object.sha;
}

export async function createBranch(name: string): Promise<void> {
  const oct = getClient();
  const { owner, repo } = repoParts();
  const sha = await getBaseSha();
  await oct.git.createRef({ owner, repo, ref: `refs/heads/${name}`, sha });
}

export async function commitEdit(args: {
  branch: string;
  path: string;
  oldString: string;
  newString: string;
  message: string;
}): Promise<{ sha: string }> {
  const oct = getClient();
  const { owner, repo } = repoParts();

  const { data: existing } = await oct.repos.getContent({
    owner,
    repo,
    path: args.path,
    ref: args.branch,
  });
  if (Array.isArray(existing) || existing.type !== 'file') {
    throw new Error(`${args.path} is not a file`);
  }

  const current = Buffer.from(existing.content!, existing.encoding as BufferEncoding).toString('utf-8');

  if (!current.includes(args.oldString)) {
    throw new Error(`The text to replace was not found in ${args.path}. The owner may need to ask the assistant to look at the current file again.`);
  }

  const occurrences = current.split(args.oldString).length - 1;
  if (occurrences > 1) {
    throw new Error(`The text appears ${occurrences} times in ${args.path}. The proposal must include enough context to be unique.`);
  }

  const updated = current.replace(args.oldString, args.newString);
  const contentB64 = Buffer.from(updated, 'utf-8').toString('base64');

  const { data: commit } = await oct.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: args.path,
    message: args.message,
    content: contentB64,
    sha: existing.sha,
    branch: args.branch,
  });

  return { sha: commit.commit.sha ?? '' };
}

export async function commitBinary(args: {
  branch: string;
  path: string;
  content: Buffer;
  message: string;
}): Promise<{ sha: string }> {
  const oct = getClient();
  const { owner, repo } = repoParts();

  let existingSha: string | undefined;
  try {
    const { data } = await oct.repos.getContent({ owner, repo, path: args.path, ref: args.branch });
    if (!Array.isArray(data) && data.type === 'file') existingSha = data.sha;
  } catch {
    /* file does not exist yet — fine */
  }

  const { data: commit } = await oct.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: args.path,
    message: args.message,
    content: args.content.toString('base64'),
    sha: existingSha,
    branch: args.branch,
  });

  return { sha: commit.commit.sha ?? '' };
}

export async function publishBranch(branch: string): Promise<void> {
  const oct = getClient();
  const { owner, repo } = repoParts();

  await oct.repos.merge({
    owner,
    repo,
    base: BASE_BRANCH,
    head: branch,
    commit_message: `Owner portal: publish ${branch}`,
  });

  try {
    await oct.git.deleteRef({ owner, repo, ref: `heads/${branch}` });
  } catch {
    /* non-fatal if branch already removed */
  }
}

export async function deleteBranch(branch: string): Promise<void> {
  const oct = getClient();
  const { owner, repo } = repoParts();
  await oct.git.deleteRef({ owner, repo, ref: `heads/${branch}` });
}

// Vercel preview alias for a git branch is:
//   {project-name}-git-{branch-name}-{scope-slug}.vercel.app
// Auto-detect from Vercel's system env vars; fall back to GITHUB_REPO parts
// so any client gets a deterministic value without per-site configuration.
function getProjectName(): string {
  return (
    envOpt('VERCEL_PROJECT_NAME') ??
    envOpt('VERCEL_GIT_REPO_SLUG') ??
    repoParts().repo
  );
}

function getScopeSlug(): string {
  const explicit = envOpt('VERCEL_SCOPE_SLUG');
  if (explicit) return explicit;

  const vurl = envOpt('VERCEL_URL');
  if (vurl) {
    const host = vurl.replace(/\.vercel\.app$/, '');
    const parts = host.split('-');
    if (parts.length >= 3) return parts[parts.length - 1]!;
  }

  // Vercel scope slug commonly matches the GitHub owner; safe deterministic fallback.
  return repoParts().owner.toLowerCase();
}

export function previewUrlFor(branch: string): string {
  return `https://${getProjectName()}-git-${branch}-${getScopeSlug()}.vercel.app`;
}
