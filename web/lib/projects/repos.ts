import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Every public repo, fetched from the GitHub API at build time (#22).
 *
 * The build must never fail because of the API: on any error, rate limit or
 * malformed response it falls back to the last good list in
 * `content/repos.cache.json` (committed) and logs a warning. A successful
 * fetch rewrites that file when the list changed.
 *
 * Set `REPOS_OFFLINE=1` to skip the API and build from the cache only
 * (hermetic e2e and Lighthouse runs).
 */

export const OWNER = "llevintza";

/** Mirrors `repo_exclude` in the Jekyll `_config.yml`. */
export const REPO_EXCLUDE: readonly string[] = [
  "llevintza", // profile README repo
  "llevintza.github.io", // this site
  "instrument-price-dashboard-access", // access-request repo
  "OSSRH-88897", // Sonatype ticket repo
];

export const REPOS_API_URL = `https://api.github.com/users/${OWNER}/repos?type=owner&per_page=100`;

export const DEFAULT_CACHE_PATH = path.join(
  process.cwd(),
  "content",
  "repos.cache.json",
);

/** Follow at most this many `Link: rel="next"` pages. */
const MAX_PAGES = 10;
const TIMEOUT_MS = 15_000;

/** One public repo, as rendered on /projects/. */
export type PublicRepo = {
  name: string;
  description: string | null;
  language: string | null;
  /** ISO 8601 timestamp of the last push. */
  pushedAt: string;
  repoUrl: string;
  /** GitHub Pages site, when the repo has one. */
  liveUrl?: string;
};

export type RepoCache = {
  repos: PublicRepo[];
};

/** The subset of the GitHub API repo object this module reads. */
export type ApiRepo = {
  name: string;
  description?: string | null;
  language?: string | null;
  pushed_at?: string | null;
  private?: boolean;
  visibility?: string;
  fork?: boolean;
  archived?: boolean;
  has_pages?: boolean;
};

export type Logger = Pick<Console, "warn" | "info">;

export type GetPublicReposOptions = {
  fetch?: typeof globalThis.fetch;
  token?: string;
  cachePath?: string;
  logger?: Logger;
  offline?: boolean;
  /** Write a changed result back to the cache file (default true). */
  writeCache?: boolean;
};

const REPO_NAME_RE = /^[\w.-]+$/;

function isApiRepo(value: unknown): value is ApiRepo {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { name?: unknown }).name === "string"
  );
}

/**
 * Public, non-fork, non-archived, not excluded. A repo is public only when
 * the API says so explicitly: a missing `private` flag drops it.
 */
export function isListable(repo: ApiRepo): boolean {
  return (
    repo.private === false &&
    (repo.visibility === undefined || repo.visibility === "public") &&
    repo.fork !== true &&
    repo.archived !== true &&
    REPO_NAME_RE.test(repo.name) &&
    !REPO_EXCLUDE.includes(repo.name)
  );
}

export function toPublicRepo(repo: ApiRepo): PublicRepo {
  return {
    name: repo.name,
    description: repo.description?.trim() || null,
    language: repo.language || null,
    pushedAt: repo.pushed_at ?? new Date(0).toISOString(),
    repoUrl: `https://github.com/${OWNER}/${repo.name}`,
    ...(repo.has_pages
      ? { liveUrl: `https://${OWNER}.github.io/${repo.name}/` }
      : {}),
  };
}

/** Newest push first; ties by name, so the order is stable. */
export function sortByPushedDesc(repos: readonly PublicRepo[]): PublicRepo[] {
  return [...repos].sort(
    (a, b) =>
      Date.parse(b.pushedAt) - Date.parse(a.pushedAt) ||
      a.name.localeCompare(b.name),
  );
}

/** Raw API list in, rendered list out. */
export function selectPublicRepos(raw: readonly ApiRepo[]): PublicRepo[] {
  const repos = sortByPushedDesc(raw.filter(isListable).map(toPublicRepo));
  assertPublicOnly(raw, repos);
  return repos;
}

/**
 * Throws if the result holds a repo the API marked private or one on the
 * exclude list. `isListable` already drops them; this guards against a
 * regression in that filter, since the site is public.
 */
export function assertPublicOnly(
  raw: readonly ApiRepo[],
  repos: readonly PublicRepo[],
): void {
  const hidden = new Set(
    raw.filter((r) => r.private !== false).map((r) => r.name),
  );
  const leaks = repos
    .map((r) => r.name)
    .filter((name) => hidden.has(name) || REPO_EXCLUDE.includes(name));
  if (leaks.length > 0) {
    throw new Error(
      `Public repos: private or excluded repos in the list (${leaks.join(", ")}).`,
    );
  }
}

class ApiError extends Error {}

function nextPageUrl(link: string | null): string | null {
  const match = link?.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

/** Every page of the owner's repos. Throws on any HTTP or shape problem. */
export async function fetchApiRepos(
  fetchImpl: typeof globalThis.fetch,
  token?: string,
): Promise<ApiRepo[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "llevintza-site-build",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const all: ApiRepo[] = [];
  let url: string | null = REPOS_API_URL;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res: Response = await fetchImpl(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const limited =
        res.status === 429 ||
        (res.status === 403 &&
          res.headers.get("x-ratelimit-remaining") === "0");
      throw new ApiError(
        limited
          ? `rate-limited (HTTP ${res.status})`
          : `HTTP ${res.status} ${res.statusText}`.trim(),
      );
    }
    const body: unknown = await res.json();
    if (!Array.isArray(body) || !body.every(isApiRepo)) {
      throw new ApiError("unexpected response shape (not a list of repos)");
    }
    all.push(...body);
    url = nextPageUrl(res.headers.get("link"));
  }
  return all;
}

function isPublicRepo(value: unknown): value is PublicRepo {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.name === "string" &&
    typeof r.pushedAt === "string" &&
    typeof r.repoUrl === "string"
  );
}

/** The cached list, re-filtered against the exclude list. Null if unusable. */
export async function readCache(
  cachePath: string,
): Promise<PublicRepo[] | null> {
  try {
    const data: unknown = JSON.parse(await readFile(cachePath, "utf8"));
    const repos = (data as Partial<RepoCache> | null)?.repos;
    if (!Array.isArray(repos) || !repos.every(isPublicRepo)) return null;
    return sortByPushedDesc(
      repos.filter(
        (r) => REPO_NAME_RE.test(r.name) && !REPO_EXCLUDE.includes(r.name),
      ),
    );
  } catch {
    return null;
  }
}

export function serializeCache(repos: readonly PublicRepo[]): string {
  const cache: RepoCache = { repos: [...repos] };
  return `${JSON.stringify(cache, null, 2)}\n`;
}

async function writeCacheIfChanged(
  cachePath: string,
  repos: readonly PublicRepo[],
  logger: Logger,
): Promise<void> {
  const next = serializeCache(repos);
  try {
    const current = await readFile(cachePath, "utf8").catch(() => null);
    if (current === next) return;
    await writeFile(cachePath, next, "utf8");
    logger.info(`[repos] Updated ${path.basename(cachePath)}.`);
  } catch (err) {
    logger.warn(`[repos] Could not write the cache: ${String(err)}`);
  }
}

/**
 * The rendered list of public repos. Never throws: falls back to the cache,
 * then to an empty list.
 */
export async function getPublicRepos(
  options: GetPublicReposOptions = {},
): Promise<PublicRepo[]> {
  const {
    fetch: fetchImpl = globalThis.fetch,
    token = process.env.GITHUB_TOKEN || undefined,
    cachePath = DEFAULT_CACHE_PATH,
    logger = console,
    offline = process.env.REPOS_OFFLINE === "1",
    writeCache = true,
  } = options;

  let reason = "REPOS_OFFLINE=1";
  if (!offline) {
    try {
      const repos = selectPublicRepos(await fetchApiRepos(fetchImpl, token));
      if (writeCache) await writeCacheIfChanged(cachePath, repos, logger);
      return repos;
    } catch (err) {
      reason =
        err instanceof ApiError
          ? err.message
          : `request failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const cached = await readCache(cachePath);
  if (cached) {
    if (!offline) {
      logger.warn(
        `[repos] warning: GitHub API ${reason}; using the cached repo list (${cached.length} repos).`,
      );
    }
    return cached;
  }
  logger.warn(
    `[repos] warning: GitHub API unavailable (${reason}) and no usable cache; rendering no repos.`,
  );
  return [];
}

let memo: Promise<PublicRepo[]> | undefined;

/** `getPublicRepos()` once per build process. */
export function getPublicReposCached(): Promise<PublicRepo[]> {
  memo ??= getPublicRepos();
  return memo;
}
