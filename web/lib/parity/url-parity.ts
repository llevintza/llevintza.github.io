// URL parity between the pre-cutover Jekyll site and the Next.js static
// export (#37). The Jekyll URLs are a frozen snapshot in
// scripts/url-parity.baseline.json.
// Pure helpers: scripts/check-url-parity.mjs does the I/O and calls these.
// Node runs this file directly (type stripping), so it must stay free of
// imports and of TypeScript syntax that needs transforming (enums, namespaces).

// Project sites served from other repos under the same host (ADR 0001). A
// project site claims `/<repo>/` ahead of the user site, so the export must
// not put routes under these prefixes.
export const FALLBACK_PROJECT_PREFIXES: readonly string[] = [
  "/email-icons/",
  "/energlens/",
  "/credit-desk-analytics/",
  "/instrument-price-dashboard/",
];

export type FeedIdentity = { id: string; selfLink: string };

export type Baseline = {
  generatedAt: string;
  source: string;
  paths: string[];
  feed: FeedIdentity | null;
};

export type ParityStatus = "ok" | "missing" | "shape-changed";

export type ParityResult = {
  path: string;
  status: ParityStatus;
  expected: string;
  file: string | null;
};

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`));
  return m ? decodeXml(m[2]) : null;
}

function linkHref(xml: string, rel: string): string | null {
  for (const m of xml.matchAll(/<link\b[^>]*>/g)) {
    // An Atom <link> without rel means rel="alternate".
    if ((attr(m[0], "rel") ?? "alternate") === rel) return attr(m[0], "href");
  }
  return null;
}

// Reads an Atom feed: its <id>, its self link, and each entry's permalink.
export function parseFeed(xml: string): {
  identity: FeedIdentity | null;
  entryLinks: string[];
} {
  const head = xml.split(/<entry\b/)[0];
  const id = head.match(/<id>\s*([^<]+?)\s*<\/id>/)?.[1];
  const selfLink = linkHref(head, "self");
  const entryLinks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/g)]
    .map((m) => linkHref(m[0], "alternate"))
    .filter((href): href is string => href !== null);
  return {
    identity: id && selfLink ? { id: decodeXml(id), selfLink: selfLink } : null,
    entryLinks,
  };
}

// The file in `out/` that must exist for GitHub Pages to serve `path`:
// `/x/` → `x/index.html`, `/` → `index.html`, a file path → that file.
export function pathToOutFile(path: string): string {
  if (!path.startsWith("/")) throw new Error(`Not a site path: ${path}`);
  const rel = path.slice(1);
  if (rel === "" || rel.endsWith("/")) return `${rel}index.html`;
  return rel;
}

// The file that would serve the path in the other shape: for `/x/` that is
// `x.html` (Pages would serve it at `/x`, and `/x/` would 404); for a file
// path `/x.y` it is `x.y/index.html` (served at `/x.y/` only).
export function alternateOutFile(path: string): string | null {
  const rel = path.slice(1);
  if (rel === "") return null;
  if (rel.endsWith("/")) return `${rel.slice(0, -1)}.html`;
  return `${rel}/index.html`;
}

export function checkPath(
  path: string,
  exists: (relFile: string) => boolean,
): ParityResult {
  const expected = pathToOutFile(path);
  if (exists(expected)) return { path, status: "ok", expected, file: expected };
  const alt = alternateOutFile(path);
  if (alt && exists(alt))
    return { path, status: "shape-changed", expected, file: alt };
  return { path, status: "missing", expected, file: null };
}

export function checkFeedIdentity(
  newFeedXml: string,
  baseline: FeedIdentity,
): string[] {
  const { identity } = parseFeed(newFeedXml);
  const problems: string[] = [];
  if (identity?.id !== baseline.id)
    problems.push(
      `feed <id> is ${JSON.stringify(identity?.id ?? null)}, expected ${JSON.stringify(baseline.id)}`,
    );
  if (identity?.selfLink !== baseline.selfLink)
    problems.push(
      `feed self link is ${JSON.stringify(identity?.selfLink ?? null)}, expected ${JSON.stringify(baseline.selfLink)}`,
    );
  return problems;
}

export function parseBaseline(raw: string): Baseline {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Baseline is not valid JSON: ${(err as Error).message}`);
  }
  const b = data as Partial<Baseline> | null;
  if (!b || typeof b !== "object")
    throw new Error("Baseline must be an object");
  if (
    typeof b.generatedAt !== "string" ||
    Number.isNaN(Date.parse(b.generatedAt))
  )
    throw new Error("Baseline generatedAt must be an ISO date");
  if (typeof b.source !== "string") throw new Error("Baseline source missing");
  if (
    !Array.isArray(b.paths) ||
    b.paths.length === 0 ||
    !b.paths.every((p) => typeof p === "string" && p.startsWith("/"))
  )
    throw new Error("Baseline paths must be a non-empty list of /paths");
  const feed = b.feed ?? null;
  if (
    feed !== null &&
    (typeof feed.id !== "string" || typeof feed.selfLink !== "string")
  )
    throw new Error("Baseline feed must have id and selfLink strings");
  return {
    generatedAt: b.generatedAt,
    source: b.source,
    paths: [...b.paths],
    feed,
  };
}

// Project-site prefixes that have a file or directory in the export. Those
// routes would be shadowed by the project site. `exists` takes a path
// relative to `out/` (no leading slash).
export function exportedProjectPrefixes(
  prefixes: readonly string[],
  exists: (relPath: string) => boolean,
): string[] {
  return prefixes.filter((p) => exists(p.replace(/^\/+|\/+$/g, "")));
}

export function formatTable(results: readonly ParityResult[]): string {
  const rows = results.map((r) => [
    r.path,
    r.status,
    r.file ?? `(no ${r.expected})`,
  ]);
  const header = ["PATH", "STATUS", "FILE IN out/"];
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => row[i].length)),
  );
  return [header, ...rows]
    .map((row) =>
      row
        .map((c, i) => c.padEnd(widths[i]))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

export function formatMarkdown(
  results: readonly ParityResult[],
  notes: readonly string[],
  baseline: Baseline,
): string {
  const failed = results.filter((r) => r.status !== "ok");
  const lines = [
    "## URL parity (Jekyll → Next.js)",
    "",
    `${results.length - failed.length}/${results.length} baseline paths served by \`web/out/\` (baseline from ${baseline.source}, ${baseline.generatedAt.slice(0, 10)}).`,
    "",
    "| Path | Status | File in `out/` |",
    "| --- | --- | --- |",
    ...results.map(
      (r) =>
        `| \`${r.path}\` | ${r.status === "ok" ? "ok" : `**${r.status}**`} | ${r.file ? `\`${r.file}\`` : `missing \`${r.expected}\``} |`,
    ),
  ];
  if (notes.length) lines.push("", ...notes.map((n) => `- ${n}`));
  return lines.join("\n") + "\n";
}
