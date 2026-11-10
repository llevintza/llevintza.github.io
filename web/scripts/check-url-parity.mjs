// URL parity check (#37): every URL the Jekyll site served before cutover must
// still be served by the static export in out/. GitHub Pages has no server
// redirects (ADR 0001), so a URL that moves is a URL that breaks.
//
// Usage (from web/, after `pnpm build`):
//   pnpm check:url-parity               check out/ against the committed baseline
//   pnpm check:url-parity --out <dir>   check another export directory
//
// The baseline is a committed snapshot of the Jekyll site, taken before the
// cutover (2026-11-10). The live site is now the Next.js site and the Jekyll
// source is gone, so the baseline is frozen: `--refresh` refuses to run,
// because re-snapshotting would compare the export with itself.
import { existsSync, readFileSync, statSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FALLBACK_PROJECT_PREFIXES,
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
  console.error(
    "check-url-parity: the baseline is a frozen snapshot of the Jekyll site (removed after the 2026-11-10 cutover); --refresh would snapshot the Next.js site instead. Edit url-parity.baseline.json by hand to retire a URL on purpose.",
  );
  process.exit(2);
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
