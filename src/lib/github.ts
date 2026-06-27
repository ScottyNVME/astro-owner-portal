import { Octokit } from '@octokit/rest';

const BASE_BRANCH = 'main';

function env(name: string): string {
  const v = import.meta.env[name] ?? process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return String(v);
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

/** All file (blob) paths on the base branch — used to resolve glob allowlists. */
export async function listFiles(): Promise<string[]> {
  const oct = getClient();
  const { owner, repo } = repoParts();
  const commitSha = await getBaseSha();
  const { data: commit } = await oct.git.getCommit({ owner, repo, commit_sha: commitSha });
  const { data } = await oct.git.getTree({
    owner,
    repo,
    tree_sha: commit.tree.sha,
    recursive: 'true',
  });
  return data.tree
    .filter((t) => t.type === 'blob' && typeof t.path === 'string')
    .map((t) => t.path as string);
}

/** Apply a single unique text replacement directly to the production branch. */
export async function commitEdit(args: {
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
    ref: BASE_BRANCH,
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
    branch: BASE_BRANCH,
  });

  return { sha: commit.commit.sha ?? '' };
}

/** Commit an uploaded binary (image) directly to the production branch. */
export async function commitBinary(args: {
  path: string;
  content: Buffer;
  message: string;
}): Promise<{ sha: string }> {
  const oct = getClient();
  const { owner, repo } = repoParts();

  let existingSha: string | undefined;
  try {
    const { data } = await oct.repos.getContent({ owner, repo, path: args.path, ref: BASE_BRANCH });
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
    branch: BASE_BRANCH,
  });

  return { sha: commit.commit.sha ?? '' };
}

/**
 * Undo the most recent owner-portal change by committing a new commit that
 * restores the repository tree to the state immediately before it. This is a
 * forward "revert" commit on the production branch (history is preserved), and
 * it redeploys like any other change.
 */
export async function revertLastChange(): Promise<{ revertedSummary: string }> {
  const oct = getClient();
  const { owner, repo } = repoParts();

  const { data: commits } = await oct.repos.listCommits({
    owner,
    repo,
    sha: BASE_BRANCH,
    per_page: 25,
  });
  const target = commits.find(
    (c) =>
      c.commit.message.startsWith('Owner portal:') &&
      !c.commit.message.startsWith('Owner portal: revert'),
  );
  if (!target) {
    throw new Error('No recent owner-portal change was found to undo.');
  }
  const parentSha = target.parents?.[0]?.sha;
  if (!parentSha) {
    throw new Error('That change has no previous state to restore.');
  }

  const { data: parentCommit } = await oct.git.getCommit({ owner, repo, commit_sha: parentSha });
  const restoreTreeSha = parentCommit.tree.sha;
  const headSha = await getBaseSha();
  const subject = target.commit.message.replace(/^Owner portal:\s*/, '');

  const { data: revertCommit } = await oct.git.createCommit({
    owner,
    repo,
    message: `Owner portal: revert "${subject}"`,
    tree: restoreTreeSha,
    parents: [headSha],
  });
  await oct.git.updateRef({ owner, repo, ref: `heads/${BASE_BRANCH}`, sha: revertCommit.sha });

  return { revertedSummary: subject };
}
