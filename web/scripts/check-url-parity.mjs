// URL parity check (#37): every URL the Jekyll site served before cutover must
// still be served by the static export in out/. GitHub Pages has no server
// redirects (ADR 0001), so a URL that moves is a URL that breaks.
//
// Usage (from web/, after `pnpm build`):
//   pnpm check:url-parity               check out/ against the committed baseline
//   pnpm check:url-parity --refresh     re-snapshot the live site into the baseline
//   pnpm check:url-parity --out <dir>   check another export directory
//
// The baseline is a committed snapshot, because after cutover the live site IS
// the Next.js site. Refresh it only while Jekyll still serves production.
// `--refresh` reads GH_TOKEN (optional) to find private repos with Pages sites.
import {
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FALLBACK_PROJECT_PREFIXES,
  buildBaseline,
  checkFeedIdentity,
  checkPath,
  exportedProjectPrefixes,
  formatMarkdown,
  formatTable,
  parseBaseline,
} from "../lib/parity/url-parity.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const baselineFile = path.join(here, "url-parity.baseline.json");
const args = process.argv.slice(2);
const outArg = args.indexOf("--out");
const outDir = path.resolve(
  path.join(here, ".."),
  outArg >= 0 ? args[outArg + 1] : "out",
);

if (args.includes("--refresh")) {
  const { baseline, prefixes, excluded } = await buildBaseline({
    fetchFn: fetch,
    githubToken: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || undefined,
    log: (m) => console.log(m),
  });
  // Private repo names stay out of git: the baseline stores kept paths only.
  console.log(`Excluded ${prefixes.length} project-site prefixes.`);
  if (excluded.length) console.log(`Dropped: ${excluded.join(", ")}`);
  writeFileSync(baselineFile, JSON.stringify(baseline, null, 2) + "\n");
  console.log(
    `Wrote ${baseline.paths.length} paths to ${path.relative(process.cwd(), baselineFile)}`,
  );
  process.exit(0);
}

const baseline = parseBaseline(readFileSync(baselineFile, "utf8"));
if (!existsSync(outDir)) {
  console.error(`No export at ${outDir}. Run \`pnpm build\` first.`);
  process.exit(1);
}

const isFile = (rel) => {
  const abs = path.join(outDir, rel);
  return existsSync(abs) && statSync(abs).isFile();
};
const results = baseline.paths.map((p) => checkPath(p, isFile));
const notes = [];
let feedProblems = [];

// Feed identity: readers key subscriptions on the Atom <id> and self link.
if (baseline.feed && isFile("feed.xml")) {
  feedProblems = checkFeedIdentity(
    readFileSync(path.join(outDir, "feed.xml"), "utf8"),
    baseline.feed,
  );
  notes.push(
    feedProblems.length
      ? `Feed identity changed: ${feedProblems.join("; ")}`
      : "Feed keeps the Jekyll `<id>` and self link.",
  );
} else if (baseline.feed) {
  notes.push(
    "warning: no `out/feed.xml` yet (#17), so the feed `<id>` and self link check was skipped.",
  );
}

// A route under a project-site prefix would be shadowed by that repo's site.
const shadowing = exportedProjectPrefixes(FALLBACK_PROJECT_PREFIXES, (rel) =>
  existsSync(path.join(outDir, rel)),
);
if (shadowing.length)
  notes.push(
    `Export has routes under project-site prefixes, which those sites shadow: ${shadowing.join(", ")}`,
  );

console.log(formatTable(results));
const failed = results.filter((r) => r.status !== "ok");
console.log(
  `\n${results.length - failed.length}/${results.length} baseline paths OK (baseline ${baseline.generatedAt.slice(0, 10)})`,
);
for (const n of notes) console.log(n);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    formatMarkdown(results, notes, baseline),
  );
}

if (failed.length || feedProblems.length || shadowing.length) process.exit(1);
