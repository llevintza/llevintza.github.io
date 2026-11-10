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
 *
 * Icons, project sites and the Portfolio link are always checked on the
 * production host: they don't come from this repo's build.
 *
 * Usage: pnpm verify:live [--base <url>] [--json]
 *   --base  base URL for the own-site paths (default https://llevintza.github.io)
 *   --json  print the results as JSON instead of a table
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
};

/** Parses .github/email-icon-urls.txt: one URL per line, `#` comments. */
export function parseIconList(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export function buildChecks(base, iconUrls) {
  const root = base.replace(/\/+$/, "");
  const own = [
    ["/", "html"],
    ["/blog/", "html"],
    ["/projects/", "html"],
    ["/about/", "html"],
    ["/feed.xml", "feed"],
    ["/sitemap.xml", "sitemap"],
  ].map(([p, kind]) => ({ group: "site", url: root + p, kind }));
  const icons = iconUrls.map((url) => ({ group: "icon", url, kind: "image" }));
  const projects = [
    "/email-icons/",
    "/energlens/",
    "/credit-desk-analytics/",
    "/instrument-price-dashboard/",
  ].map((p) => ({ group: "project", url: PROD + p, kind: "html" }));
  const portfolio = { group: "portfolio", url: `${PROD}/`, kind: "html" };
  return [...own, ...icons, ...projects, portfolio];
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
  const opts = { base: PROD, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") opts.json = true;
    else if (argv[i] === "--base") opts.base = argv[++i];
    else if (argv[i].startsWith("--base=")) opts.base = argv[i].slice(7);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!/^https?:\/\//.test(opts.base ?? ""))
    throw new Error("--base must be an http(s) URL");
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const icons = parseIconList(readFileSync(ICON_LIST, "utf8"));
  if (icons.length === 0) throw new Error(`No URLs in ${ICON_LIST}`);
  const checks = buildChecks(opts.base, icons);
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
