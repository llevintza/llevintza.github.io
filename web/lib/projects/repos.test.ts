import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ApiRepo,
  REPO_EXCLUDE,
  REPOS_API_URL,
  assertPublicOnly,
  getPublicRepos,
  readCache,
  selectPublicRepos,
  serializeCache,
} from "./repos";

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
        repoUrl: "https://github.com/llevintza/secret",
      },
    ];
    expect(() => assertPublicOnly(raw, leaked)).toThrow(/secret/);
    expect(() =>
      assertPublicOnly([], [{ ...leaked[0], name: "llevintza.github.io" }]),
    ).toThrow(/llevintza\.github\.io/);
  });

  it("sorts by last push, newest first, ties by name", () => {
    const names = selectPublicRepos([
      repo("older", { pushed_at: "2024-05-01T00:00:00Z" }),
      repo("newest", { pushed_at: "2026-11-01T00:00:00Z" }),
      repo("b-tie", { pushed_at: "2025-06-01T00:00:00Z" }),
      repo("a-tie", { pushed_at: "2025-06-01T00:00:00Z" }),
    ]).map((r) => r.name);

    expect(names).toEqual(["newest", "a-tie", "b-tie", "older"]);
  });

  it("links the Pages site only when the repo has Pages", () => {
    const [withPages, without] = selectPublicRepos([
      repo("site", { has_pages: true, pushed_at: "2026-02-01T00:00:00Z" }),
      repo("tool", { has_pages: false }),
    ]);

    expect(withPages).toMatchObject({
      name: "site",
      repoUrl: "https://github.com/llevintza/site",
      liveUrl: "https://llevintza.github.io/site/",
    });
    expect(without.liveUrl).toBeUndefined();
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
    });

    expect(repos.map((r) => r.name)).toEqual(["a", "b"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([
      REPOS_API_URL,
      expect.objectContaining({ headers: expect.any(Object) }),
    ]);
    expect(await readFile(cachePath, "utf8")).toBe(serializeCache(repos));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("sends GITHUB_TOKEN as a bearer token when set", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => json([]));
    await getPublicRepos({
      fetch: fetchMock,
      token: "test-token",
      cachePath,
      logger: silentLogger(),
      offline: false,
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
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(next);
    expect(repos.map((r) => r.name).sort()).toEqual(["one", "two"]);
  });

  it("does not rewrite an unchanged cache", async () => {
    const repos = selectPublicRepos([repo("same")]);
    await writeFile(cachePath, serializeCache(repos));
    const logger = silentLogger();

    await getPublicRepos({
      fetch: async () => json([repo("same")]),
      cachePath,
      logger,
      offline: false,
    });

    expect(logger.info).not.toHaveBeenCalled();
  });

  describe("fallback to the cache", () => {
    const cached = selectPublicRepos([
      repo("cached-old", { pushed_at: "2024-01-01T00:00:00Z" }),
      repo("cached-new", { pushed_at: "2026-01-01T00:00:00Z" }),
    ]);

    beforeEach(async () => {
      await writeFile(cachePath, serializeCache(cached));
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
      });
      expect(repos).toEqual(cached);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("request failed: fetch failed"),
      );
    });

    it("without calling the API when offline", async () => {
      const fetchMock = vi.fn();
      const logger = silentLogger();
      const repos = await getPublicRepos({
        fetch: fetchMock,
        cachePath,
        logger,
        offline: true,
      });
      expect(repos).toEqual(cached);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("re-applies the exclude list to cached entries", async () => {
      await writeFile(
        cachePath,
        serializeCache([
          ...cached,
          { ...cached[0], name: "llevintza.github.io" },
        ]),
      );
      const repos = await readCache(cachePath);
      expect(repos?.map((r) => r.name)).toEqual(["cached-new", "cached-old"]);
    });
  });

  it("returns an empty list, never throws, when the API and cache both fail", async () => {
    const logger = silentLogger();
    const repos = await getPublicRepos({
      fetch: async () => json({}, { status: 500 }),
      cachePath: path.join(dir, "missing.json"),
      logger,
      offline: false,
    });
    expect(repos).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("no usable cache"),
    );
  });

  it("treats a corrupt cache as missing", async () => {
    await writeFile(cachePath, "{not json");
    expect(await readCache(cachePath)).toBeNull();
  });
});
