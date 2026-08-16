const GITHUB_API = 'https://api.github.com';

const IGNORED_PATTERNS = [
  /package-lock\.json$/, /yarn\.lock$/, /\.min\.js$/,
  /^dist\//, /^build\//, /node_modules\//, /^target\//,
];

function isIgnored(path) {
  return IGNORED_PATTERNS.some((p) => p.test(path));
}

function authHeaders(token) {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'EazyPortfolio-pipeline' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ghJson(pathname, token) {
  const res = await fetch(`${GITHUB_API}${pathname}`, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`GitHub API ${pathname} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function parseLastPage(linkHeader) {
  if (!linkHeader) return 1;
  const match = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return match ? parseInt(match[1], 10) : 1;
}

async function getTotalCommits(owner, repo, token) {
  // With per_page=1, the "last" page number in the Link header equals the
  // total commit count on the default branch — cheap way to avoid paginating
  // through everything just to get a count.
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=1`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`commit count fetch failed: ${res.status} ${await res.text()}`);
  return parseLastPage(res.headers.get('link'));
}

async function getReadme(owner, repo, token) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
    headers: { ...authHeaders(token), Accept: 'application/vnd.github.raw' },
  });
  if (!res.ok) return ''; // no README, or private/inaccessible — don't fabricate one
  return res.text();
}

async function getContributors(owner, repo, token) {
  const data = await ghJson(`/repos/${owner}/${repo}/contributors?per_page=100`, token);
  return data.map((c) => ({ name: c.login, commits: c.contributions }));
}

/**
 * Fetches the same evidence shape the github-fetcher subagent produces.
 *
 * Cost note: computing hotspot files requires one API call per sampled
 * commit (GitHub's commit-list endpoint doesn't include changed files,
 * only the single-commit endpoint does). `commitSample` caps this — fine
 * for on-demand personal use with a token (5000 req/hr), but at
 * multi-tenant scale this needs caching or a smaller sample rather than a
 * full re-scan per generation.
 */
export async function fetchRepoEvidence(owner, repo, { token, commitSample = 50 } = {}) {
  const meta = await ghJson(`/repos/${owner}/${repo}`, token);
  const totalCommits = await getTotalCommits(owner, repo, token);
  const contributors = await getContributors(owner, repo, token);
  const readmeContent = await getReadme(owner, repo, token);

  const repoMetadata = {
    name: meta.name,
    url: meta.html_url,
    last_updated: meta.pushed_at,
    total_commits: totalCommits,
    contributors,
  };

  if (totalCommits < 10) {
    // Mirrors the subagent's rule: too little history for hotspot analysis,
    // the analyzer will fall back to evidence_level: "readme_only".
    return {
      repo_metadata: repoMetadata,
      readme_content: readmeContent,
      hotspot_files: [],
      hotspot_commit_messages: {},
    };
  }

  const commitList = await ghJson(`/repos/${owner}/${repo}/commits?per_page=${commitSample}`, token);

  const fileCounts = new Map();
  const fileMessages = new Map();

  for (const c of commitList) {
    const detail = await ghJson(`/repos/${owner}/${repo}/commits/${c.sha}`, token);
    const message = detail.commit.message.split('\n')[0];
    for (const f of detail.files || []) {
      if (isIgnored(f.filename)) continue;
      fileCounts.set(f.filename, (fileCounts.get(f.filename) || 0) + 1);
      if (!fileMessages.has(f.filename)) fileMessages.set(f.filename, []);
      // commitList arrives newest-first; unshift to end up chronological (oldest first)
      fileMessages.get(f.filename).unshift(message);
    }
  }

  const hotspotFiles = [...fileCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, commits]) => ({ path, commits }));

  const hotspotCommitMessages = {};
  for (const { path } of hotspotFiles) {
    hotspotCommitMessages[path] = fileMessages.get(path) || [];
  }

  return {
    repo_metadata: repoMetadata,
    readme_content: readmeContent,
    hotspot_files: hotspotFiles,
    hotspot_commit_messages: hotspotCommitMessages,
  };
}
