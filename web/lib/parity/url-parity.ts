// URL parity between the live Jekyll site and the Next.js static export (#37).
// Pure helpers: scripts/check-url-parity.mjs does the I/O and calls these.
// Node runs this file directly (type stripping), so it must stay free of
// imports and of TypeScript syntax that needs transforming (enums, namespaces).

export const SITE_ORIGIN = "https://llevintza.github.io";
export const GITHUB_OWNER = "llevintza";

// Project sites served from other repos under the same host (ADR 0001). A
// project site claims `/<repo>/` ahead of the user site, so these prefixes are
// never part of this site's URLs. `--refresh` adds the repos the GitHub API
// reports with `has_pages`; this list is the fallback when the API is out of reach.
export const FALLBACK_PROJECT_PREFIXES: readonly string[] = [
  "/email-icons/",
  "/energlens/",
  "/credit-desk-analytics/",
  "/instrument-price-dashboard/",
];

// URLs the Jekyll site serves that the sitemap doesn't list.
export const SEED_PATHS: readonly string[] = [
  "/",
  "/blog/",
  "/projects/",
  "/about/",
  "/feed.xml",
  "/sitemap.xml",
  "/robots.txt",
  "/404.html",
];

// GitHub Pages serves /404.html with status 404, so it can't be probed by status.
const ALWAYS_KEEP = new Set(["/404.html"]);

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

type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; redirect?: "follow" | "manual" },
) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export function extractSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) =>
    decodeXml(m[1]),
  );
}

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

// An absolute or root-relative URL → its path on this site, or null when it
// points at another host.
export function toSitePath(url: string, origin = SITE_ORIGIN): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, origin);
  } catch {
    return null;
  }
  if (parsed.origin !== new URL(origin).origin) return null;
  return decodeURI(parsed.pathname) || "/";
}

export function isProjectSitePath(
  path: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some((p) => path === p.slice(0, -1) || path.startsWith(p));
}

// Repo names with GitHub Pages on → `/<name>/` prefixes. The user-site repo
// (`<owner>.github.io`) is this site, not a prefix.
export function pagesPrefixes(
  repos: readonly { name: string; has_pages?: boolean }[],
  owner = GITHUB_OWNER,
): string[] {
  return repos
    .filter((r) => r.has_pages && r.name.toLowerCase() !== `${owner}.github.io`)
    .map((r) => `/${r.name}/`);
}

export function mergePrefixes(...lists: readonly (readonly string[])[]) {
  return [...new Set(lists.flat())].sort();
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

// Paths whose first segment is a project-site repo name: a Pages repo with
// that name would shadow the route (ADR 0001).
// The `rel="next"` URL from a GitHub API `Link` header, if any.
export function nextPageUrl(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
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

export function shadowedPaths(
  paths: readonly string[],
  prefixes: readonly string[],
): string[] {
  return paths.filter((p) => isProjectSitePath(p, prefixes));
}

// Builds the baseline from the live site. `fetchFn` is injected for tests.
export async function buildBaseline(opts: {
  fetchFn: FetchLike;
  origin?: string;
  owner?: string;
  githubToken?: string;
  now?: Date;
  log?: (msg: string) => void;
}): Promise<{ baseline: Baseline; prefixes: string[]; excluded: string[] }> {
  const origin = opts.origin ?? SITE_ORIGIN;
  const owner = opts.owner ?? GITHUB_OWNER;
  const log = opts.log ?? (() => {});
  const { fetchFn } = opts;

  const getText = async (url: string) => {
    const res = await fetchFn(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    return res.text();
  };

  let apiPrefixes: string[] = [];
  try {
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
    };
    if (opts.githubToken) headers.authorization = `Bearer ${opts.githubToken}`;
    // With a token, /user/repos also lists the owner's private repos whose
    // Pages sites are public.
    const url = opts.githubToken
      ? "https://api.github.com/user/repos?per_page=100&affiliation=owner"
      : `https://api.github.com/users/${owner}/repos?per_page=100&type=owner`;
    const repos: { name: string; has_pages?: boolean }[] = [];
    // Follow `Link: rel="next"` so an owner with more than 100 repos is covered.
    for (let next: string | null = url; next;) {
      const res = await fetchFn(next, { headers });
      if (!res.ok) throw new Error(`GitHub API → ${res.status}`);
      repos.push(...((await res.json()) as typeof repos));
      next = nextPageUrl(res.headers?.get("link") ?? null);
    }
    apiPrefixes = pagesPrefixes(repos, owner);
  } catch (err) {
    log(
      `warning: GitHub API unavailable (${(err as Error).message}); using the fallback project-site list only`,
    );
  }
  const prefixes = mergePrefixes(FALLBACK_PROJECT_PREFIXES, apiPrefixes);

  const candidates = new Set<string>();
  const sitemap = await getText(`${origin}/sitemap.xml`);
  for (const loc of extractSitemapLocs(sitemap)) {
    const p = toSitePath(loc, origin);
    if (p) candidates.add(p);
  }
  const feedXml = await getText(`${origin}/feed.xml`);
  const feed = parseFeed(feedXml);
  for (const link of feed.entryLinks) {
    const p = toSitePath(link, origin);
    if (p) candidates.add(p);
  }
  for (const seed of SEED_PATHS) {
    if (ALWAYS_KEEP.has(seed)) {
      candidates.add(seed);
      continue;
    }
    const res = await fetchFn(`${origin}${seed}`, { redirect: "follow" });
    if (res.ok) candidates.add(seed);
    else log(`skip ${seed}: live site answers ${res.status}`);
  }

  const excluded = shadowedPaths([...candidates], prefixes);
  const paths = [...candidates]
    .filter((p) => !excluded.includes(p))
    .sort((a, b) => a.localeCompare(b));

  return {
    baseline: {
      generatedAt: (opts.now ?? new Date()).toISOString(),
      source: origin,
      paths,
      feed: feed.identity,
    },
    prefixes,
    excluded,
  };
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
