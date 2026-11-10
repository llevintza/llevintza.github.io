import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ApiRepo,
  MAX_CACHE_AGE_MS,
  REPO_EXCLUDE,
  REPOS_API_URL,
  assertPublicOnly,
  getPublicRepos,
  readCache,
  selectPublicRepos,
  serializeCache,
} from "./repos";

const NOW = new Date("2026-11-10T12:00:00Z");
const now = () => NOW;
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const repo = (name: string, extra: Partial<ApiRepo> = {}): ApiRepo => ({
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

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });

const silentLogger = () => ({ warn: vi.fn(), info: vi.fn() });

let dir: string;
let cachePath: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "repos-test-"));
  cachePath = path.join(dir, "repos.cache.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("selectPublicRepos", () => {
  it("drops forks, archived, private and excluded repos", () => {
    const names = selectPublicRepos([
      repo("keep"),
      repo("a-fork", { fork: true }),
      repo("old", { archived: true }),
      repo("secret", { private: true, visibility: "private" }),
      repo("internal", { private: false, visibility: "internal" }),
      repo("no-flag", { private: undefined }),
      ...REPO_EXCLUDE.map((name) => repo(name)),
    ]).map((r) => r.name);

    expect(names).toEqual(["keep"]);
  });

  it("never lists a private repo", () => {
    const raw = [
      repo("public-one"),
      repo("private-one", { private: true, visibility: "private" }),
    ];
    const repos = selectPublicRepos(raw);
    expect(repos.map((r) => r.name)).not.toContain("private-one");
    expect(() => assertPublicOnly(raw, repos)).not.toThrow();
  });

  it("assertPublicOnly throws when a private or excluded repo leaks", () => {
    const raw = [repo("secret", { private: true })];
    const leaked = [
      {
        name: "secret",
        description: null,
        language: null,
        pushedAt: "2026-01-01T00:00:00Z",
        hasPages: false,
        repoUrl: "https://github.com/llevintza/secret",
      },
    ];
    expect(() => assertPublicOnly(raw, leaked)).toThrow(/secret/);
    expect(() =>
      assertPublicOnly([], [{ ...leaked[0], name: "llevintza.github.io" }]),
    ).toThrow(/llevintza\.github\.io/);
  });

  it("sorts by last push, newest first, ties by name, never-pushed last", () => {
    const names = selectPublicRepos([
      repo("empty", { pushed_at: null }),
      repo("older", { pushed_at: "2024-05-01T00:00:00Z" }),
      repo("newest", { pushed_at: "2026-11-01T00:00:00Z" }),
      repo("b-tie", { pushed_at: "2025-06-01T00:00:00Z" }),
      repo("a-tie", { pushed_at: "2025-06-01T00:00:00Z" }),
    ]).map((r) => r.name);

    expect(names).toEqual(["newest", "a-tie", "b-tie", "older", "empty"]);
  });

  it("keeps a null pushed date for an empty repo instead of the epoch", () => {
    const [r] = selectPublicRepos([repo("empty", { pushed_at: null })]);
    expect(r.pushedAt).toBeNull();
  });

  it("links the Pages site only when the repo has Pages", () => {
    const [withPages, without] = selectPublicRepos([
      repo("site", { has_pages: true, pushed_at: "2026-02-01T00:00:00Z" }),
      repo("tool", { has_pages: false }),
    ]);

    expect(withPages).toMatchObject({
      name: "site",
      hasPages: true,
      repoUrl: "https://github.com/llevintza/site",
      liveUrl: "https://llevintza.github.io/site/",
    });
    expect(without).not.toHaveProperty("liveUrl");
  });

  it("keeps name, description, language and pushed date", () => {
    const [r] = selectPublicRepos([
      repo("x", { description: "  trimmed  ", language: null }),
    ]);
    expect(r).toEqual({
      name: "x",
      description: "trimmed",
      language: null,
      pushedAt: "2026-01-01T00:00:00Z",
      hasPages: false,
      repoUrl: "https://github.com/llevintza/x",
    });
  });
});

describe("getPublicRepos", () => {
  it("fetches the owner's repos, filters, sorts and writes the cache", async () => {
    const fetchMock = vi.fn(async () =>
      json([
        repo("b", { pushed_at: "2025-01-01T00:00:00Z" }),
        repo("a", { pushed_at: "2026-01-01T00:00:00Z", has_pages: true }),
        repo("fork", { fork: true }),
      ]),
    );
    const logger = silentLogger();

    const repos = await getPublicRepos({
      fetch: fetchMock,
      cachePath,
      logger,
      offline: false,
      now,
    });

    expect(repos.map((r) => r.name)).toEqual(["a", "b"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([
      REPOS_API_URL,
      expect.objectContaining({ headers: expect.any(Object) }),
    ]);
    expect(await readFile(cachePath, "utf8")).toBe(serializeCache(repos, NOW));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("stores no URLs in the cache", async () => {
    await getPublicRepos({
      fetch: async () => json([repo("site", { has_pages: true })]),
      cachePath,
      logger: silentLogger(),
      offline: false,
      now,
    });
    const text = await readFile(cachePath, "utf8");
    expect(text).not.toMatch(/https?:/);
    expect(JSON.parse(text)).toEqual({
      fetchedAt: NOW.toISOString(),
      repos: [
        {
          name: "site",
          description: "site description",
          language: "TypeScript",
          pushedAt: "2026-01-01T00:00:00Z",
          hasPages: true,
        },
      ],
    });
  });

  it("sends GITHUB_TOKEN as a bearer token when set", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => json([]));
    await getPublicRepos({
      fetch: fetchMock,
      token: "test-token",
      cachePath,
      logger: silentLogger(),
      offline: false,
      now,
    });
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer test-token");
  });

  it("sends no Authorization header without a token", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => json([]));
    await getPublicRepos({
      fetch: fetchMock,
      token: undefined,
      cachePath,
      logger: silentLogger(),
      offline: false,
      now,
    });
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("follows Link rel=next pages", async () => {
    const next = "https://api.github.com/user/1/repos?page=2";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json([repo("one")], {
          headers: { link: `<${next}>; rel="next", <${next}>; rel="last"` },
        }),
      )
      .mockResolvedValueOnce(json([repo("two")]));

    const repos = await getPublicRepos({
      fetch: fetchMock,
      cachePath,
      logger: silentLogger(),
      offline: false,
      now,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(next);
    expect(repos.map((r) => r.name).sort()).toEqual(["one", "two"]);
  });

  it("does not rewrite an unchanged, recent cache", async () => {
    const repos = selectPublicRepos([repo("same")]);
    const before = serializeCache(repos, daysAgo(0.5));
    await writeFile(cachePath, before);
    const logger = silentLogger();

    await getPublicRepos({
      fetch: async () => json([repo("same")]),
      cachePath,
      logger,
      offline: false,
      now,
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(await readFile(cachePath, "utf8")).toBe(before);
  });

  it("refreshes fetchedAt on an unchanged cache over a day old", async () => {
    const repos = selectPublicRepos([repo("same")]);
    await writeFile(cachePath, serializeCache(repos, daysAgo(2)));

    await getPublicRepos({
      fetch: async () => json([repo("same")]),
      cachePath,
      logger: silentLogger(),
      offline: false,
      now,
    });

    expect((await readCache(cachePath))?.fetchedAt).toBe(NOW.toISOString());
  });

  describe("fallback to the cache", () => {
    const cached = selectPublicRepos([
      repo("cached-old", { pushed_at: "2024-01-01T00:00:00Z" }),
      repo("cached-new", { pushed_at: "2026-01-01T00:00:00Z" }),
    ]);

    beforeEach(async () => {
      await writeFile(cachePath, serializeCache(cached, daysAgo(3)));
    });

    it.each([
      [
        "rate-limited (403)",
        () =>
          json(
            { message: "API rate limit exceeded" },
            {
              status: 403,
              headers: { "x-ratelimit-remaining": "0" },
            },
          ),
        /rate-limited \(HTTP 403\)/,
      ],
      [
        "rate-limited (429)",
        () => json({ message: "slow down" }, { status: 429 }),
        /rate-limited \(HTTP 429\)/,
      ],
      [
        "server error",
        () => json({ message: "boom" }, { status: 502 }),
        /HTTP 502/,
      ],
      [
        "malformed body",
        () => json({ message: "not a list" }),
        /unexpected response shape/,
      ],
    ])("on %s", async (_label, respond, warning) => {
      const logger = silentLogger();
      const before = await readFile(cachePath, "utf8");

      const repos = await getPublicRepos({
        fetch: async () => respond(),
        cachePath,
        logger,
        offline: false,
        now,
      });

      expect(repos).toEqual(cached);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(warning));
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("using the cached repo list"),
      );
      expect(await readFile(cachePath, "utf8")).toBe(before);
    });

    it("on a network error", async () => {
      const logger = silentLogger();
      const repos = await getPublicRepos({
        fetch: async () => {
          throw new TypeError("fetch failed");
        },
        cachePath,
        logger,
        offline: false,
        now,
      });
      expect(repos).toEqual(cached);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("request failed: fetch failed"),
      );
    });

    it("renders no repos when the cache is older than 14 days", async () => {
      expect(MAX_CACHE_AGE_MS).toBe(14 * 24 * 60 * 60 * 1000);
      await writeFile(cachePath, serializeCache(cached, daysAgo(15)));
      const logger = silentLogger();

      const repos = await getPublicRepos({
        fetch: async () => json({}, { status: 503 }),
        cachePath,
        logger,
        offline: false,
        now,
      });

      expect(repos).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("the cache is 15 days old"),
      );
    });

    it("renders no repos when fetchedAt is in the future", async () => {
      await writeFile(cachePath, serializeCache(cached, daysAgo(-30)));
      const logger = silentLogger();

      const repos = await getPublicRepos({
        fetch: async () => json({}, { status: 503 }),
        cachePath,
        logger,
        offline: false,
        now,
      });

      expect(repos).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("is in the future"),
      );
    });

    it("without calling the API when offline, at any cache age", async () => {
      await writeFile(cachePath, serializeCache(cached, daysAgo(400)));
      const fetchMock = vi.fn();
      const logger = silentLogger();
      const repos = await getPublicRepos({
        fetch: fetchMock,
        cachePath,
        logger,
        offline: true,
        now,
      });
      expect(repos).toEqual(cached);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("re-applies the exclude list to cached entries", async () => {
      await writeFile(
        cachePath,
        serializeCache(
          [...cached, { ...cached[0], name: "llevintza.github.io" }],
          daysAgo(1),
        ),
      );
      const cache = await readCache(cachePath);
      expect(cache?.repos.map((r) => r.name).sort()).toEqual([
        "cached-new",
        "cached-old",
      ]);
    });

    it("ignores URLs in a hand-edited cache and rebuilds them from the name", async () => {
      await writeFile(
        cachePath,
        JSON.stringify({
          fetchedAt: daysAgo(1).toISOString(),
          repos: [
            {
              name: "tool",
              description: null,
              language: null,
              pushedAt: "2026-01-01T00:00:00Z",
              hasPages: true,
              repoUrl: "https://evil.example/tool",
              liveUrl: "https://evil.example/",
            },
          ],
        }),
      );
      const repos = await getPublicRepos({
        fetch: async () => json({}, { status: 500 }),
        cachePath,
        logger: silentLogger(),
        offline: false,
        now,
      });
      expect(repos).toEqual([
        {
          name: "tool",
          description: null,
          language: null,
          pushedAt: "2026-01-01T00:00:00Z",
          hasPages: true,
          repoUrl: "https://github.com/llevintza/tool",
          liveUrl: "https://llevintza.github.io/tool/",
        },
      ]);
    });
  });

  it("returns an empty list, never throws, when the API and cache both fail", async () => {
    const logger = silentLogger();
    const repos = await getPublicRepos({
      fetch: async () => json({}, { status: 500 }),
      cachePath: path.join(dir, "missing.json"),
      logger,
      offline: false,
      now,
    });
    expect(repos).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("no usable cache"),
    );
  });

  it.each([
    ["corrupt JSON", "{not json"],
    ["no fetchedAt", JSON.stringify({ repos: [] })],
    [
      "an old-format entry",
      JSON.stringify({
        fetchedAt: NOW.toISOString(),
        repos: [{ name: "x", pushedAt: "2026-01-01T00:00:00Z" }],
      }),
    ],
  ])("treats a cache with %s as missing", async (_label, text) => {
    await writeFile(cachePath, text);
    expect(await readCache(cachePath)).toBeNull();
  });
});
