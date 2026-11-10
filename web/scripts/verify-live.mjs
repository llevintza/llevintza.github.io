#!/usr/bin/env node
/**
 * Cutover verification (#38, docs/runbooks/cutover.md): checks that every URL
 * people or sent emails rely on still answers 200 with the right content.
 * Works against the Jekyll site (before the switch) and the Next.js export
 * (after it), so run it on both sides and compare.
 *
 *   - own site: /, /blog/, /projects/, /about/ (HTML), /feed.xml (Atom/RSS),
 *     /sitemap.xml (sitemap) under the base URL
 *   - email-signature icons from .github/email-icon-urls.txt (image/*)
 *   - project sites served from their own repos: /email-icons/, /energlens/,
 *     /credit-desk-analytics/, /instrument-price-dashboard/
 *   - the Portfolio link https://llevintza.github.io/
 *   - with --urls-from: every <loc> of a saved sitemap, re-based onto --base
 *     (snapshot the Jekyll sitemap before the switch, re-check after it, so
 *     old permalinks are verified on the live host)
 *
 * Icons, project sites and the Portfolio link are always checked on the
 * production host: they don't come from this repo's build.
 *
 * Usage: pnpm verify:live [--base <url>] [--urls-from <file|url>] [--json]
 *   --base       base URL for the own-site paths (default https://llevintza.github.io)
 *   --urls-from  a sitemap XML file or URL; each <loc> path must answer 200 on --base
 *   --json       print the results as JSON instead of a table
 * Exits 1 if any check fails.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROD = "https://llevintza.github.io";
const TIMEOUT_MS = 15_000;
const ATTEMPTS = 3;

const here = path.dirname(fileURLToPath(import.meta.url));
const ICON_LIST = path.resolve(here, "../../.github/email-icon-urls.txt");

const isHtml = (type, body) =>
  type.includes("text/html") && /<html[\s>]/i.test(body);

export const KINDS = {
  html: {
    label: "HTML page",
    test: ({ type, body }) => isHtml(type, body),
  },
  feed: {
    label: "Atom/RSS feed",
    test: ({ type, body }) => /xml/.test(type) && /<(feed|rss)[\s>]/.test(body),
  },
  sitemap: {
    label: "XML sitemap",
    test: ({ type, body }) => /xml/.test(type) && /<urlset[\s>]/.test(body),
  },
  image: { label: "image", test: ({ type }) => type.startsWith("image/") },
  // Sitemap entries: any content type, the status is what matters.
  page: { label: "page", test: () => true },
};

/** Parses .github/email-icon-urls.txt: one URL per line, `#` comments. */
export function parseIconList(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

/**
 * Paths (with query) of every <loc> in a sitemap, de-duplicated, in order.
 * Paths, not URLs, so a production snapshot can be re-checked on any base.
 */
export function parseSitemapPaths(xml) {
  const paths = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(
    ([, loc]) => {
      const u = new URL(loc.replaceAll("&amp;", "&"));
      return u.pathname + u.search;
    },
  );
  return [...new Set(paths)];
}

export function buildChecks(base, iconUrls, sitemapPaths = []) {
  const root = base.replace(/\/+$/, "");
  const own = [
    ["/", "html"],
    ["/blog/", "html"],
    ["/projects/", "html"],
    ["/about/", "html"],
    ["/feed.xml", "feed"],
    ["/sitemap.xml", "sitemap"],
  ].map(([p, kind]) => ({ group: "site", url: root + p, kind }));
  const ownPaths = new Set(own.map((c) => c.url));
  const fromSitemap = sitemapPaths
    .map((p) => root + p)
    .filter((url) => !ownPaths.has(url))
    .map((url) => ({ group: "sitemap", url, kind: "page" }));
  const icons = iconUrls.map((url) => ({ group: "icon", url, kind: "image" }));
  const projects = [
    "/email-icons/",
    "/energlens/",
    "/credit-desk-analytics/",
    "/instrument-price-dashboard/",
  ].map((p) => ({ group: "project", url: PROD + p, kind: "html" }));
  const portfolio = { group: "portfolio", url: `${PROD}/`, kind: "html" };
  return [...own, ...fromSitemap, ...icons, ...projects, portfolio];
}

async function fetchOnce(url, kind) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "verify-live (cutover check)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  let body = "";
  if (kind === "image") await res.body?.cancel();
  else body = await res.text();
  return { status: res.status, type, body };
}

export async function runCheck(check, fetcher = fetchOnce) {
  let last;
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      const r = await fetcher(check.url, check.kind);
      const contentOk = r.status === 200 && KINDS[check.kind].test(r);
      last = {
        ...check,
        status: r.status,
        type: r.type.split(";")[0],
        ok: contentOk,
        detail: contentOk
          ? "ok"
          : r.status !== 200
            ? `HTTP ${r.status}`
            : `expected ${KINDS[check.kind].label}`,
      };
      // Retry only what looks transient: 5xx and 429.
      if (last.ok || (r.status < 500 && r.status !== 429)) return last;
    } catch (err) {
      const detail =
        err?.name === "TimeoutError"
          ? "timeout"
          : String(err?.cause?.code ?? err?.message ?? err);
      last = { ...check, status: 0, type: "", ok: false, detail };
    }
  }
  return last;
}

function parseArgs(argv) {
  const opts = { base: PROD, json: false, urlsFrom: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") opts.json = true;
    else if (argv[i] === "--base") opts.base = argv[++i];
    else if (argv[i].startsWith("--base=")) opts.base = argv[i].slice(7);
    else if (argv[i] === "--urls-from") opts.urlsFrom = argv[++i];
    else if (argv[i].startsWith("--urls-from="))
      opts.urlsFrom = argv[i].slice(12);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!/^https?:\/\//.test(opts.base ?? ""))
    throw new Error("--base must be an http(s) URL");
  if (opts.urlsFrom === undefined) throw new Error("--urls-from needs a value");
  return opts;
}

async function readSitemap(source) {
  if (!/^https?:\/\//.test(source)) return readFileSync(source, "utf8");
  const res = await fetch(source, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`--urls-from ${source}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const icons = parseIconList(readFileSync(ICON_LIST, "utf8"));
  if (icons.length === 0) throw new Error(`No URLs in ${ICON_LIST}`);
  let sitemapPaths = [];
  if (opts.urlsFrom) {
    sitemapPaths = parseSitemapPaths(await readSitemap(opts.urlsFrom));
    if (sitemapPaths.length === 0)
      throw new Error(`No <loc> entries in ${opts.urlsFrom}`);
  }
  const checks = buildChecks(opts.base, icons, sitemapPaths);
  const results = await Promise.all(checks.map((c) => runCheck(c)));
  const failed = results.filter((r) => !r.ok);

  if (opts.json) {
    console.log(JSON.stringify({ base: opts.base, results }, null, 2));
  } else {
    console.log(`verify-live  base=${opts.base}  ${new Date().toISOString()}`);
    for (const r of results) {
      console.log(
        [
          r.ok ? "PASS" : "FAIL",
          String(r.status).padEnd(3),
          r.group.padEnd(9),
          (r.type || "-").padEnd(22),
          r.url,
          r.ok ? "" : `  <- ${r.detail}`,
        ]
          .join("  ")
          .trimEnd(),
      );
    }
    console.log(
      `\n${results.length - failed.length}/${results.length} checks passed`,
    );
  }
  if (failed.length > 0) process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((err) => {
    console.error(`verify-live: ${err.message}`);
    process.exit(2);
  });
}
