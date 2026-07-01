/**
 * GitHub API Service
 * Creates real GitHub issues from bug reports.
 *
 * Environment variables required:
 *   GITHUB_PAT        — Personal Access Token with `repo` scope
 *   GITHUB_REPO_OWNER — e.g. "your-org"
 *   GITHUB_REPO_NAME  — e.g. "your-repo"
 */

const GITHUB_PAT = process.env.GITHUB_PAT ?? "";
const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO_NAME ?? "";
const GITHUB_API = "https://api.github.com";

interface GitHubIssueResponse {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: string;
}

interface GitHubRateLimitInfo {
  remaining: number;
  reset: number; // unix timestamp
}

// ─── Core request helper ──────────────────────────────────────────────
async function githubRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  retries = 3
): Promise<{ data: T; rateLimit: GitHubRateLimitInfo }> {
  if (!GITHUB_PAT) {
    throw new Error("GITHUB_PAT not configured. Set it in .env to enable GitHub integration.");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${GITHUB_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "bug-triage-max/1.0",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const rateLimit: GitHubRateLimitInfo = {
      remaining: parseInt(res.headers.get("X-RateLimit-Remaining") ?? "60", 10),
      reset: parseInt(res.headers.get("X-RateLimit-Reset") ?? "0", 10),
    };

    // Rate limit hit — wait and retry
    if (res.status === 429 || (res.status === 403 && rateLimit.remaining === 0)) {
      const waitMs = (rateLimit.reset * 1000 - Date.now()) + 1000;
      console.warn(`[GitHub] Rate limited. Waiting ${Math.round(waitMs / 1000)}s...`);
      await new Promise((r) => setTimeout(r, Math.max(waitMs, 5000)));
      continue;
    }

    if (!res.ok) {
      const errBody = await res.text();
      if (attempt === retries) {
        throw new Error(`GitHub API ${res.status}: ${errBody}`);
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }

    const data = (await res.json()) as T;
    return { data, rateLimit };
  }

  throw new Error("GitHub API: all retries exhausted");
}

// ─── Create Issue ─────────────────────────────────────────────────────
export async function createGitHubIssue(params: {
  title: string;
  body: string;
  labels?: string[];
}): Promise<{ number: number; url: string; id: number }> {
  if (!GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error("GITHUB_REPO_OWNER and GITHUB_REPO_NAME must be set in .env");
  }

  const { data } = await githubRequest<GitHubIssueResponse>(
    "POST",
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
    {
      title: params.title,
      body: params.body,
      labels: params.labels ?? ["bug", "triage-max"],
    }
  );

  return { number: data.number, url: data.html_url, id: data.id };
}

// ─── Get Issue ────────────────────────────────────────────────────────
export async function getGitHubIssue(issueNumber: number): Promise<{
  number: number;
  url: string;
  state: string;
  title: string;
} | null> {
  if (!GITHUB_OWNER || !GITHUB_REPO) return null;

  try {
    const { data } = await githubRequest<GitHubIssueResponse>(
      "GET",
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`
    );
    return {
      number: data.number,
      url: data.html_url,
      state: data.state,
      title: data.title,
    };
  } catch {
    return null;
  }
}

// ─── List Recent Closed Issues ────────────────────────────────────────
export async function listClosedIssues(since: Date): Promise<
  Array<{ number: number; title: string; url: string; labels: string[] }>
> {
  if (!GITHUB_OWNER || !GITHUB_REPO) return [];

  try {
    const { data } = await githubRequest<
      Array<{ number: number; title: string; html_url: string; labels: Array<{ name: string }> }>
    >(
      "GET",
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=closed&since=${since.toISOString()}&per_page=50`
    );

    return data.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      labels: issue.labels.map((l) => l.name),
    }));
  } catch {
    return [];
  }
}

// ─── Create Draft Release ─────────────────────────────────────────────
export async function createDraftRelease(params: {
  tagName: string;
  name: string;
  body: string;
}): Promise<{ id: number; url: string } | null> {
  if (!GITHUB_OWNER || !GITHUB_REPO) return null;

  try {
    const { data } = await githubRequest<{ id: number; html_url: string }>(
      "POST",
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      {
        tag_name: params.tagName,
        name: params.name,
        body: params.body,
        draft: true,
        prerelease: false,
      }
    );
    return { id: data.id, url: data.html_url };
  } catch (err) {
    console.error("[GitHub] createDraftRelease failed:", err);
    return null;
  }
}

// ─── Check rate limit ─────────────────────────────────────────────────
export async function checkRateLimit(): Promise<GitHubRateLimitInfo | null> {
  if (!GITHUB_PAT) return null;
  try {
    const { rateLimit } = await githubRequest<{ rate: { remaining: number; reset: number } }>(
      "GET",
      "/rate_limit"
    );
    return rateLimit;
  } catch {
    return null;
  }
}

export const githubConfigured = !!(GITHUB_PAT && GITHUB_OWNER && GITHUB_REPO);
