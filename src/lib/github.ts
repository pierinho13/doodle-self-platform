import { runCommand, runJson } from "./exec";

const ORG = "DoodleScheduling";
const GITOPS_REPO = "devops-tenants";

export interface PromotionPR {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  /** Version string extracted from the PR title, when present */
  proposedVersion: string | null;
}

export interface PromotionPRs {
  /** keyed by service/HelmRelease name -> open "update preprod release" PR */
  preprodBump: Map<string, PromotionPR>;
  /** keyed by service/HelmRelease name -> open "promote to" PR */
  productionPromote: Map<string, PromotionPR>;
}

interface RawPR {
  number: number;
  title: string;
  url: string;
  createdAt: string;
}

// Renovate-authored preprod bump PRs, e.g.:
//   "fix: update preprod release svc-sso-saml to 45.15.1"
const PREPROD_BUMP_RE = /^fix: update preprod release (.+) to (.+)$/;

// promote-release-authored (or manually opened, matching the same
// convention) production promotion PRs, e.g.:
//   "fix(svc-sso-saml): promote to 45.15.1"
const PROMOTE_RE = /^fix\(([^)]+)\): promote to (.+)$/;

/**
 * Lists every open PR in devops-tenants and classifies the ones that match
 * the known Renovate / promote-release title conventions. PRs that don't
 * match either pattern (e.g. unrelated infra PRs) are ignored.
 */
export async function fetchOpenPromotionPRs(): Promise<PromotionPRs> {
  const raw = await runJson<RawPR[]>("gh", [
    "pr",
    "list",
    "--repo",
    `${ORG}/${GITOPS_REPO}`,
    "--state",
    "open",
    "--limit",
    "500",
    "--json",
    "number,title,url,createdAt",
  ]);

  const preprodBump = new Map<string, PromotionPR>();
  const productionPromote = new Map<string, PromotionPR>();

  for (const pr of raw) {
    const bumpMatch = pr.title.match(PREPROD_BUMP_RE);
    if (bumpMatch) {
      preprodBump.set(bumpMatch[1], {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        createdAt: pr.createdAt,
        proposedVersion: bumpMatch[2],
      });
      continue;
    }

    const promoteMatch = pr.title.match(PROMOTE_RE);
    if (promoteMatch) {
      productionPromote.set(promoteMatch[1], {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        createdAt: pr.createdAt,
        proposedVersion: promoteMatch[2],
      });
    }
  }

  return { preprodBump, productionPromote };
}

export interface LatestRelease {
  tagName: string;
  publishedAt: string;
  url: string;
}

let cachedToken: string | null = null;
async function getGithubToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  // Prefer an explicit token from the environment -- this is what `gh`
  // itself falls back to for ambient auth, but `gh auth token` specifically
  // only returns a token from a stored `gh auth login` session and ignores
  // these env vars entirely, so we can't rely on it when auth comes from
  // GITHUB_TOKEN/GH_TOKEN alone.
  const envToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (envToken) {
    cachedToken = envToken;
    return cachedToken;
  }

  cachedToken = (await runCommand("gh", ["auth", "token"])).trim();
  return cachedToken;
}

/**
 * Fetches the latest release for a single repo, trying each candidate name
 * in order and returning the first that exists. Returns null if none of
 * the candidates have a repo or a release (e.g. repos that only tag
 * without publishing a GitHub Release).
 */
export async function fetchLatestRelease(
  candidates: string[]
): Promise<{ repo: string; release: LatestRelease } | null> {
  const token = await getGithubToken();

  for (const repo of candidates) {
    const res = await fetch(
      `https://api.github.com/repos/${ORG}/${repo}/releases/latest`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (res.status === 404) continue; // try next candidate
    if (!res.ok) {
      throw new Error(`GitHub API error for ${repo}: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      tag_name: string;
      published_at: string;
      html_url: string;
    };
    return {
      repo,
      release: {
        tagName: data.tag_name,
        publishedAt: data.published_at,
        url: data.html_url,
      },
    };
  }

  return null;
}

/**
 * Runs an async mapper over items with a bounded number of in-flight calls,
 * to avoid firing hundreds of simultaneous GitHub API requests at once.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
