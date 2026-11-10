import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ApiRepo,
  type FetchLike,
  REPOS_API_URL,
  serializeCache,
} from "../../lib/projects/repos";
import {
  MAX_AGE_DAYS,
  cacheAge,
  diffRepos,
  formatSummary,
  refreshRepos,
} from "../refresh-repos.mjs";

const NOW = new Date("2026-11-10T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);

const api = (name: string, extra: Partial<ApiRepo> = {}): ApiRepo => ({
  name,
  description: `${name} description`,
  language: "TypeScript",
  pushed_at: "2026-01-01T00:00:00Z",
  private: false,
  visibility: "public",
  fork: false,
  archived: false,
  has_pages: false,
  ...extra,
});

const cached = (name: string, pushedAt = "2026-01-01T00:00:00Z") => ({
  name,
  description: `${name} description`,
  language: "TypeScript",
  pushedAt,
  hasPages: false,
});

// The only network the script sees: one page, no Link header.
const mockFetch = (body: unknown, status = 200) =>
  vi.fn<FetchLike>(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );

let dir: string;
let cachePath: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "refresh-repos-test-"));
  cachePath = path.join(dir, "repos.cache.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("refreshRepos", () => {
  it("writes only public repos, never private, forked, archived or excluded ones", async () => {
    const fetch = mockFetch([
      api("public-one", { pushed_at: "2026-03-01T00:00:00Z" }),
      api("secret", { private: true, visibility: "private" }),
      api("no-flag", { private: undefined }),
      api("internal", { visibility: "internal" }),
      api("a-fork", { fork: true }),
      api("old", { archived: true }),
      api("llevintza.github.io"),
      api("public-two", { pushed_at: "2026-02-01T00:00:00Z" }),
    ]);

    const result = await refreshRepos({
      fetch,
      cachePath,
      now: () => NOW,
      token: "t",
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe(REPOS_API_URL);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer t");
    const file = await readFile(cachePath, "utf8");
    expect(JSON.parse(file).repos.map((r: { name: string }) => r.name)).toEqual(
      ["public-one", "public-two"],
    );
    for (const hidden of ["secret", "no-flag", "internal", "a-fork", "old"]) {
      expect(file).not.toContain(hidden);
    }
    expect(file).not.toContain("https://");
    expect(result).toMatchObject({
      written: true,
      count: 2,
      skipped: 6,
      previousFetchedAt: null,
      fetchedAt: NOW.toISOString(),
    });
  });

  it("writes the same bytes as the build's serializer (stable sort and format)", async () => {
    const fetch = mockFetch([
      api("b", { pushed_at: "2026-01-01T00:00:00Z" }),
      api("c", { pushed_at: "2026-05-01T00:00:00Z" }),
      api("a", { pushed_at: "2026-01-01T00:00:00Z" }),
    ]);
    await refreshRepos({ fetch, cachePath, now: () => NOW });

    expect(await readFile(cachePath, "utf8")).toBe(
      serializeCache(
        [cached("c", "2026-05-01T00:00:00Z"), cached("a"), cached("b")],
        NOW,
      ),
    );
  });

  it("leaves no diff when the list is unchanged and the cache is under a day old", async () => {
    const before = serializeCache(
      [cached("a")],
      new Date(NOW.getTime() - 3_600_000),
    );
    await writeFile(cachePath, before);

    const result = await refreshRepos({
      fetch: mockFetch([api("a")]),
      cachePath,
      now: () => NOW,
    });

    expect(result.written).toBe(false);
    expect(await readFile(cachePath, "utf8")).toBe(before);
    expect(formatSummary(result)).toContain("No change");
  });

  it("moves only fetchedAt when the list is unchanged but the cache is older", async () => {
    await writeFile(cachePath, serializeCache([cached("a")], daysAgo(20)));

    const result = await refreshRepos({
      fetch: mockFetch([api("a")]),
      cachePath,
      now: () => NOW,
    });

    expect(result.written).toBe(true);
    expect(await readFile(cachePath, "utf8")).toBe(
      serializeCache([cached("a")], NOW),
    );
    expect(formatSummary(result)).toContain("only fetchedAt moved");
  });

  it("reports added, removed and changed repos", async () => {
    await writeFile(
      cachePath,
      serializeCache(
        [cached("keep"), cached("gone"), cached("edit")],
        daysAgo(2),
      ),
    );

    const result = await refreshRepos({
      fetch: mockFetch([
        api("keep"),
        api("edit", { language: "Go", has_pages: true }),
        api("new"),
        api("gone", { private: true }),
      ]),
      cachePath,
      now: () => NOW,
    });

    expect(result.diff).toEqual({
      added: ["new"],
      removed: ["gone"],
      changed: [{ name: "edit", fields: ["language", "hasPages"] }],
    });
    const summary = formatSummary(result);
    expect(summary).toContain("Added (1): new");
    expect(summary).toContain("Removed (1): gone");
    expect(summary).toContain("Changed: edit (language, hasPages)");
    expect(summary).toContain(
      `${daysAgo(2).toISOString()} -> ${NOW.toISOString()}`,
    );
  });

  it("throws on an API error and leaves the cache untouched", async () => {
    const before = serializeCache([cached("a")], daysAgo(20));
    await writeFile(cachePath, before);

    await expect(
      refreshRepos({
        fetch: mockFetch({ message: "boom" }, 503),
        cachePath,
        now: () => NOW,
      }),
    ).rejects.toThrow(/HTTP 503/);
    await expect(
      refreshRepos({
        fetch: mockFetch({ not: "a list" }),
        cachePath,
        now: () => NOW,
      }),
    ).rejects.toThrow(/unexpected response shape/);
    expect(await readFile(cachePath, "utf8")).toBe(before);
  });
});

describe("diffRepos", () => {
  it("is empty for identical lists", () => {
    expect(diffRepos([cached("a")], [cached("a")])).toEqual({
      added: [],
      removed: [],
      changed: [],
    });
  });
});

describe("cacheAge", () => {
  it.each([
    [0, 0, false],
    [3, 3, false],
    [14, 14, false],
    [15, 15, true],
  ])("a %i-day-old cache is %i days old, stale: %s", (ago, days, stale) => {
    expect(cacheAge({ fetchedAt: daysAgo(ago).toISOString() }, NOW)).toEqual({
      days,
      stale,
    });
  });

  it("treats a fetchedAt in the future as stale", () => {
    expect(cacheAge({ fetchedAt: daysAgo(-2).toISOString() }, NOW).stale).toBe(
      true,
    );
  });

  it("uses the build's 14-day limit", () => {
    expect(MAX_AGE_DAYS).toBe(14);
  });
});

// repo-cache.yml runs the script from a sparse checkout with no pnpm install,
// through Node's type stripping. Fail here, not in a scheduled run, if either
// file gains a package, alias or extra relative import, or TypeScript syntax
// that Node can't strip.
describe("runs without pnpm install (repo-cache.yml)", () => {
  const read = (rel: string) =>
    readFile(path.join(import.meta.dirname, rel), "utf8");
  const specifiers = (src: string) =>
    [
      ...src.matchAll(
        // `… from "x"`, a bare `import "x"`, and a dynamic `import("x")`.
        /^\s*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/gm,
      ),
    ].map((m) => m[1] ?? m[2] ?? m[3]);

  it("repos.ts imports only node: built-ins and uses only erasable syntax", async () => {
    const src = await read("../../lib/projects/repos.ts");
    const specs = specifiers(src);
    expect(specs.length).toBeGreaterThan(0);
    for (const s of specs) {
      expect(s.startsWith("node:") && builtinModules.includes(s.slice(5))).toBe(
        true,
      );
    }
    expect(src).not.toMatch(/^\s*(?:export\s+)?(?:const\s+)?enum\s/m);
    expect(src).not.toMatch(/^\s*(?:export\s+)?(?:namespace|module)\s+\w/m);
    expect(src).not.toMatch(
      /constructor\s*\([^)]*\b(?:private|public|protected|readonly)\s/,
    );
  });

  it("the script imports only node: built-ins and repos.ts", async () => {
    const specs = specifiers(await read("../refresh-repos.mjs"));
    for (const s of specs) {
      expect(
        s === "../lib/projects/repos.ts" ||
          (s.startsWith("node:") && builtinModules.includes(s.slice(5))),
      ).toBe(true);
    }
  });
});
