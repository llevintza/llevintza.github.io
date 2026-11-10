#!/usr/bin/env node
/**
 * Refreshes the committed repo cache, `content/repos.cache.json` (#99).
 *
 * The build falls back to that cache when the GitHub API fails, at any age,
 * so a repo that went private could stay linked until the cache is refreshed.
 * This script fetches the public repo list exactly as the build does (same
 * API call, same public-only filter from `lib/projects/repos.ts`), rewrites
 * the cache and prints what changed. Commit the file and open a PR.
 *
 * The output is deterministic: the build's stable sort and JSON formatting,
 * and `fetchedAt` is only moved when the list changed or the cache is at
 * least a day old, so a re-run on unchanged data leaves no diff. Private,
 * forked, archived and excluded repos are never written.
 *
 *   pnpm refresh:repos            fetch, rewrite the cache, print a summary
 *   pnpm refresh:repos --check    print the cache age only (no network); in
 *                                 GitHub Actions also writes age_days, stale
 *                                 and fetched_at to $GITHUB_OUTPUT
 *
 * Uses GITHUB_TOKEN (or GH_TOKEN) when set; unauthenticated works too (60
 * requests/hour). Exits 1 on an API error without touching the cache.
 * Node 22.18+ (imports the TypeScript module through type stripping).
 */
import { appendFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAX_CACHE_AGE_MS,
  fetchApiRepos,
  nodeFetch,
  readCache,
  selectPublicRepos,
  serializeCache,
  toCachedRepo,
} from "../lib/projects/repos.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_PATH = path.join(here, "..", "content", "repos.cache.json");

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_AGE_DAYS = MAX_CACHE_AGE_MS / DAY_MS;
/** An unchanged list still moves `fetchedAt` once the cache is this old. */
const RESTAMP_MS = DAY_MS;
const FIELDS = ["description", "language", "pushedAt", "hasPages"];

/**
 * @typedef {import("../lib/projects/repos.ts").CachedRepo} CachedRepo
 * @typedef {{ added: string[], removed: string[],
 *   changed: { name: string, fields: string[] }[] }} RepoDiff
 */

/**
 * Names added and removed, and per-field changes, sorted by name.
 * @param {readonly CachedRepo[]} before
 * @param {readonly CachedRepo[]} after
 * @returns {RepoDiff}
 */
export function diffRepos(before, after) {
  const old = new Map(before.map((r) => [r.name, r]));
  const now = new Map(after.map((r) => [r.name, r]));
  const byName = (a, b) => a.localeCompare(b);
  const added = [...now.keys()].filter((n) => !old.has(n)).sort(byName);
  const removed = [...old.keys()].filter((n) => !now.has(n)).sort(byName);
  const changed = [...now.keys()]
    .filter((n) => old.has(n))
    .sort(byName)
    .map((name) => ({
      name,
      fields: FIELDS.filter((f) => old.get(name)[f] !== now.get(name)[f]),
    }))
    .filter((c) => c.fields.length > 0);
  return { added, removed, changed };
}

/**
 * Age of a cache in whole days. Stale past the build's 14-day limit, or when
 * `fetchedAt` is in the future (as untrustworthy as an old one).
 * @param {{ fetchedAt: string }} cache
 * @param {Date} now
 */
export function cacheAge(cache, now) {
  const ageMs = now.getTime() - Date.parse(cache.fetchedAt);
  return {
    days: Math.floor(ageMs / DAY_MS),
    stale: ageMs < 0 || ageMs > MAX_CACHE_AGE_MS,
  };
}

/**
 * Fetches the public list and rewrites the cache when it changed or is at
 * least a day old. Throws on any API problem, before writing anything.
 * @param {{ fetch?: import("../lib/projects/repos.ts").FetchLike,
 *   token?: string, cachePath?: string, now?: () => Date }} [options]
 */
export async function refreshRepos(options = {}) {
  const {
    fetch: fetchImpl = nodeFetch,
    token,
    cachePath = CACHE_PATH,
    now = () => new Date(),
  } = options;
  const raw = await fetchApiRepos(fetchImpl, token);
  const repos = selectPublicRepos(raw).map(toCachedRepo);
  const current = await readCache(cachePath);
  const at = now();

  const diff = diffRepos(current?.repos ?? [], repos);
  const sameList =
    current !== null && JSON.stringify(current.repos) === JSON.stringify(repos);
  const recent =
    current !== null &&
    at.getTime() - Date.parse(current.fetchedAt) >= 0 &&
    at.getTime() - Date.parse(current.fetchedAt) < RESTAMP_MS;
  const written = !(sameList && recent);
  if (written) await writeFile(cachePath, serializeCache(repos, at), "utf8");

  return {
    diff,
    written,
    count: repos.length,
    skipped: raw.length - repos.length,
    previousFetchedAt: current?.fetchedAt ?? null,
    fetchedAt: written ? at.toISOString() : current.fetchedAt,
  };
}

/**
 * The human summary printed after a refresh (also pasted into the PR).
 * @param {Awaited<ReturnType<typeof refreshRepos>>} result
 */
export function formatSummary(result) {
  const { diff, written, count, skipped, previousFetchedAt, fetchedAt } =
    result;
  const lines = [
    `${count} public repos (${skipped} private, forked, archived or excluded repos left out).`,
  ];
  if (!written) {
    lines.push(
      `No change: the cache already matches and is under a day old (fetchedAt ${fetchedAt}).`,
    );
    return lines.join("\n");
  }
  lines.push(
    `fetchedAt: ${previousFetchedAt ?? "(no usable cache)"} -> ${fetchedAt}`,
  );
  const list = (names) => names.join(", ");
  if (diff.added.length)
    lines.push(`Added (${diff.added.length}): ${list(diff.added)}`);
  if (diff.removed.length)
    lines.push(`Removed (${diff.removed.length}): ${list(diff.removed)}`);
  for (const c of diff.changed) {
    lines.push(`Changed: ${c.name} (${c.fields.join(", ")})`);
  }
  if (!diff.added.length && !diff.removed.length && !diff.changed.length) {
    lines.push("Repo list unchanged; only fetchedAt moved.");
  }
  return lines.join("\n");
}

async function check(cachePath, now) {
  const cache = await readCache(cachePath);
  if (!cache) {
    throw new Error(`${path.basename(cachePath)} is missing or invalid`);
  }
  const { days, stale } = cacheAge(cache, now);
  console.log(
    `${path.basename(cachePath)} was fetched ${cache.fetchedAt}: ${days} days old (stale after ${MAX_AGE_DAYS} days)${stale ? ": STALE, run pnpm refresh:repos" : ""}.`,
  );
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `age_days=${days}\nstale=${stale}\nfetched_at=${cache.fetchedAt}\n`,
    );
  }
}

async function main(argv) {
  const unknown = argv.filter((a) => a !== "--check");
  if (unknown.length) throw new Error(`Unknown argument: ${unknown[0]}`);
  if (argv.includes("--check")) return check(CACHE_PATH, new Date());

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined;
  const result = await refreshRepos({ token });
  console.log(formatSummary(result));
  if (result.written) {
    console.log(
      `\nWrote ${path.relative(process.cwd(), CACHE_PATH)}: commit it and open a PR.`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`refresh:repos: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
