import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";

/**
 * Every public repo, fetched from the GitHub API at build time (#22).
 *
 * An API problem never empties /projects/: on any error, rate limit or
 * malformed response the build falls back to the last good list in
 * `content/repos.cache.json` (committed) and logs a warning. A cache older
 * than 14 days (`fetchedAt`) is still used, with a louder warning, since a
 * repo may have gone private since that snapshot: refresh and commit it. With
 * no usable cache at all the build fails, so a deploy keeps the last good
 * site. In GitHub Actions the warnings are `::warning::` annotations. A
 * successful fetch rewrites the cache file when the list changed. The cache
 * stores no URLs; repo and Pages links are always rebuilt from the validated
 * repo name.
 *
 * The API is called through `node:https`, not the global `fetch`: Next.js
 * patches that one and stores responses in `.next/cache/fetch-cache`, which CI
 * restores between runs, so a build could render a stale API response.
 *
 * Set `REPOS_OFFLINE=1` to skip the API and build from the cache only, at any
 * age (hermetic e2e and Lighthouse runs; never set it for a deploy).
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
const DAY_MS = 24 * 60 * 60 * 1000;
/** Older caches still render, but with a stale-cache warning. */
export const MAX_CACHE_AGE_MS = 14 * DAY_MS;
/** Refresh `fetchedAt` at most this often when the list is unchanged. */
const CACHE_REFRESH_MS = DAY_MS;

/** One public repo as stored in the cache: data only, no URLs. */
export type CachedRepo = {
  name: string;
  description: string | null;
  language: string | null;
  /** ISO 8601 timestamp of the last push; null for an empty repo. */
  pushedAt: string | null;
  hasPages: boolean;
};

/** One public repo, as rendered on /projects/. */
export type PublicRepo = CachedRepo & {
  repoUrl: string;
  /** GitHub Pages site, when the repo has one. */
  liveUrl?: string;
};

export type RepoCache = {
  /** ISO 8601 time of the API fetch this list came from. */
  fetchedAt: string;
  repos: CachedRepo[];
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

/** The part of `fetch` this module uses: a GET with headers and a signal. */
export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal?: AbortSignal },
) => Promise<Response>;

export type GetPublicReposOptions = {
  /** Defaults to `nodeFetch`, which bypasses Next's fetch cache. */
  fetch?: FetchLike;
  token?: string;
  cachePath?: string;
  logger?: Logger;
  offline?: boolean;
  /** Write a changed result back to the cache file (default true). */
  writeCache?: boolean;
  /** Clock for the cache age check and `fetchedAt` (tests). */
  now?: () => Date;
  /** Emit warnings as GitHub Actions `::warning::` annotations. */
  annotate?: boolean;
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

/** Adds the links, built only from the (validated) repo name. */
export function withLinks(repo: CachedRepo): PublicRepo {
  return {
    ...repo,
    repoUrl: `https://github.com/${OWNER}/${repo.name}`,
    ...(repo.hasPages
      ? { liveUrl: `https://${OWNER}.github.io/${repo.name}/` }
      : {}),
  };
}

export function toPublicRepo(repo: ApiRepo): PublicRepo {
  const pushed = repo.pushed_at ? Date.parse(repo.pushed_at) : NaN;
  return withLinks({
    name: repo.name,
    description: repo.description?.trim() || null,
    language: repo.language || null,
    pushedAt: Number.isNaN(pushed) ? null : (repo.pushed_at as string),
    hasPages: repo.has_pages === true,
  });
}

/** Newest push first, never-pushed last; ties by name, so it's stable. */
export function sortByPushedDesc<T extends CachedRepo>(
  repos: readonly T[],
): T[] {
  const time = (r: CachedRepo) =>
    r.pushedAt === null ? -Infinity : Date.parse(r.pushedAt);
  return [...repos].sort((a, b) => {
    const ta = time(a);
    const tb = time(b);
    if (ta !== tb) return tb > ta ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
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

/** A response body over this size is dropped (the list is ~100 KB/page). */
export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

/**
 * A GET over `node:http(s)`, returning a standard `Response`. Unlike the
 * global `fetch`, which Next.js patches, it never reads or writes
 * `.next/cache/fetch-cache`, so every build sees the live API.
 *
 * It does not follow redirects: a 3xx is returned as is, which the caller
 * treats as an error, so the token is never sent to another host.
 */
export const nodeFetch: FetchLike = (url, { headers, signal }) =>
  new Promise<Response>((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "http:" ? http : https;
    const req = client.get(target, { headers, signal }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          req.destroy(
            new Error(`response larger than ${MAX_RESPONSE_BYTES} bytes`),
          );
          return;
        }
        chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => {
        try {
          const out = new Headers();
          for (const [name, value] of Object.entries(res.headers)) {
            for (const v of Array.isArray(value) ? value : [value]) {
              if (v !== undefined) out.append(name, v);
            }
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 502,
              statusText: res.statusMessage ?? "",
              headers: out,
            }),
          );
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
  });

/**
 * The `rel="next"` URL, only on the API's own origin (https), since the next
 * request carries the token. Anything else throws, so the build falls back
 * to the cache.
 */
function nextPageUrl(link: string | null): string | null {
  const match = link?.match(/<([^>]+)>;\s*rel="next"/);
  if (!match) return null;
  let origin: string | undefined;
  try {
    origin = new URL(match[1]).origin;
  } catch {
    // Not a URL: rejected below.
  }
  if (origin !== new URL(REPOS_API_URL).origin) {
    throw new ApiError("next-page link is not on api.github.com");
  }
  return match[1];
}

/** Every page of the owner's repos. Throws on any HTTP or shape problem. */
export async function fetchApiRepos(
  fetchImpl: FetchLike,
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

const nullableString = (v: unknown) => v === null || typeof v === "string";

function isCachedRepo(value: unknown): value is CachedRepo {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.name === "string" &&
    nullableString(r.description) &&
    nullableString(r.language) &&
    (r.pushedAt === null ||
      (typeof r.pushedAt === "string" &&
        !Number.isNaN(Date.parse(r.pushedAt)))) &&
    typeof r.hasPages === "boolean"
  );
}

/**
 * The cache file, validated: known fields only, names re-checked against the
 * name pattern and the exclude list. Null if missing or unusable.
 */
export async function readCache(cachePath: string): Promise<RepoCache | null> {
  try {
    const data = JSON.parse(await readFile(cachePath, "utf8")) as unknown;
    if (typeof data !== "object" || data === null) return null;
    const { fetchedAt, repos } = data as Record<string, unknown>;
    if (typeof fetchedAt !== "string" || Number.isNaN(Date.parse(fetchedAt))) {
      return null;
    }
    if (!Array.isArray(repos) || !repos.every(isCachedRepo)) return null;
    return {
      fetchedAt,
      repos: repos
        .filter(
          (r) => REPO_NAME_RE.test(r.name) && !REPO_EXCLUDE.includes(r.name),
        )
        .map(({ name, description, language, pushedAt, hasPages }) => ({
          name,
          description,
          language,
          pushedAt,
          hasPages,
        })),
    };
  } catch {
    return null;
  }
}

/** Strips the links: the cache holds data only. */
export function toCachedRepo({
  name,
  description,
  language,
  pushedAt,
  hasPages,
}: CachedRepo): CachedRepo {
  return { name, description, language, pushedAt, hasPages };
}

export function serializeCache(
  repos: readonly CachedRepo[],
  fetchedAt: Date,
): string {
  const cache: RepoCache = {
    fetchedAt: fetchedAt.toISOString(),
    repos: repos.map(toCachedRepo),
  };
  return `${JSON.stringify(cache, null, 2)}\n`;
}

/**
 * Writes the cache when the list changed, or when `fetchedAt` is over a day
 * old, so a committed refresh keeps the fallback inside its 14-day window
 * (past it, a fallback build warns that the cache is stale).
 */
async function writeCacheIfChanged(
  cachePath: string,
  repos: readonly PublicRepo[],
  now: Date,
  logger: Logger,
): Promise<void> {
  try {
    const current = await readCache(cachePath);
    const same =
      current !== null &&
      JSON.stringify(current.repos) ===
        JSON.stringify(repos.map(toCachedRepo)) &&
      now.getTime() - Date.parse(current.fetchedAt) < CACHE_REFRESH_MS;
    if (same) return;
    await writeFile(cachePath, serializeCache(repos, now), "utf8");
    logger.info(`[repos] Updated ${path.basename(cachePath)}.`);
  } catch (err) {
    logger.warn(`[repos] Could not write the cache: ${String(err)}`);
  }
}

/**
 * Escapes text for a GitHub Actions workflow command, so a newline or `%` in
 * an upstream error message can't end the annotation or start another one.
 */
export function escapeAnnotation(text: string): string {
  return text
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

/**
 * The rendered list of public repos. Falls back to the cache, at any age, on
 * an API problem. Throws only when there is no usable cache either, so the
 * build fails instead of publishing an empty list.
 */
export async function getPublicRepos(
  options: GetPublicReposOptions = {},
): Promise<PublicRepo[]> {
  const {
    fetch: fetchImpl = nodeFetch,
    token = process.env.GITHUB_TOKEN || undefined,
    cachePath = DEFAULT_CACHE_PATH,
    logger = console,
    offline = process.env.REPOS_OFFLINE === "1",
    writeCache = true,
    now = () => new Date(),
    annotate = process.env.GITHUB_ACTIONS === "true",
  } = options;
  const warn = (message: string) =>
    logger.warn(
      annotate
        ? `::warning title=Repo list::${escapeAnnotation(message)}`
        : `[repos] warning: ${message}`,
    );

  let reason = "REPOS_OFFLINE=1";
  if (!offline) {
    try {
      const repos = selectPublicRepos(await fetchApiRepos(fetchImpl, token));
      if (writeCache) {
        await writeCacheIfChanged(cachePath, repos, now(), logger);
      }
      return repos;
    } catch (err) {
      reason =
        err instanceof ApiError
          ? err.message
          : `request failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const cache = await readCache(cachePath);
  if (!cache) {
    throw new Error(
      offline
        ? `[repos] REPOS_OFFLINE=1 but ${path.basename(cachePath)} is missing or invalid; failing the build rather than rendering no repos.`
        : `[repos] GitHub API ${reason} and ${path.basename(cachePath)} is missing or invalid; failing the build rather than rendering no repos.`,
    );
  }
  const repos = sortByPushedDesc(cache.repos.map(withLinks));
  if (offline) return repos;

  const ageMs = now().getTime() - Date.parse(cache.fetchedAt);
  const ageDays = Math.floor(ageMs / DAY_MS);
  const limitDays = MAX_CACHE_AGE_MS / DAY_MS;
  const used = `using the cached repo list (${repos.length} repos, fetched ${cache.fetchedAt})`;
  // A future fetchedAt (typo, hand edit) is as untrustworthy as an old one.
  if (ageMs >= 0 && ageMs <= MAX_CACHE_AGE_MS) {
    warn(
      `GitHub API ${reason}; ${used}. The cache is ${ageDays} ${ageDays === 1 ? "day" : "days"} old (stale after ${limitDays} days).`,
    );
  } else {
    const age =
      ageMs < 0
        ? "has a fetchedAt in the future"
        : `is ${ageDays} days old (stale after ${limitDays} days)`;
    warn(
      `GitHub API ${reason} and the cache ${age}; ${used}. A repo may have gone private since: run \`pnpm refresh:repos\` and commit ${path.basename(cachePath)}.`,
    );
  }
  return repos;
}

let memo: Promise<PublicRepo[]> | undefined;

/** `getPublicRepos()` once per build process. */
export function getPublicReposCached(): Promise<PublicRepo[]> {
  memo ??= getPublicRepos();
  return memo;
}
