import { describe, expect, it, vi } from "vitest";
import {
  alternateOutFile,
  buildBaseline,
  checkFeedIdentity,
  checkPath,
  extractSitemapLocs,
  isProjectSitePath,
  pagesPrefixes,
  parseBaseline,
  parseFeed,
  pathToOutFile,
  toSitePath,
} from "./url-parity";

const ORIGIN = "https://llevintza.github.io";

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${ORIGIN}/about/</loc></url>
<url><loc>${ORIGIN}/blog/</loc></url>
<url><loc>${ORIGIN}/</loc></url>
<url><loc>${ORIGIN}/energlens/</loc></url>
<url><loc>https://example.com/elsewhere/</loc></url>
</urlset>`;

const FEED = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom">
<link href="${ORIGIN}/feed.xml" rel="self" type="application/atom+xml" />
<link href="${ORIGIN}/" rel="alternate" type="text/html" />
<id>${ORIGIN}/feed.xml</id><title>Site</title>
<entry><title>Hello</title><link href="${ORIGIN}/blog/2026/01/02/hello-world/" rel="alternate" type="text/html" title="Hello" /><id>${ORIGIN}/blog/2026/01/02/hello-world</id></entry>
<entry><title>No rel</title><link href="/blog/2026/03/04/a&amp;b/" /></entry>
</feed>`;

describe("pathToOutFile", () => {
  it.each([
    ["/", "index.html"],
    ["/blog/", "blog/index.html"],
    ["/blog/2026/01/02/hello/", "blog/2026/01/02/hello/index.html"],
    ["/feed.xml", "feed.xml"],
    ["/404.html", "404.html"],
    ["/robots.txt", "robots.txt"],
  ])("%s → %s", (path, file) => {
    expect(pathToOutFile(path)).toBe(file);
  });

  it("rejects a path without a leading slash", () => {
    expect(() => pathToOutFile("blog/")).toThrow();
  });

  it("names the file for the other shape", () => {
    expect(alternateOutFile("/blog/")).toBe("blog.html");
    expect(alternateOutFile("/feed.xml")).toBe("feed.xml/index.html");
    expect(alternateOutFile("/")).toBeNull();
  });
});

describe("checkPath", () => {
  const files =
    (...names: string[]) =>
    (f: string) =>
      names.includes(f);

  it("is ok when the expected file exists", () => {
    expect(checkPath("/blog/", files("blog/index.html"))).toEqual({
      path: "/blog/",
      status: "ok",
      expected: "blog/index.html",
      file: "blog/index.html",
    });
  });

  it("flags a trailing-slash page exported as x.html", () => {
    const r = checkPath("/about/", files("about.html"));
    expect(r.status).toBe("shape-changed");
    expect(r.file).toBe("about.html");
  });

  it("flags a file path exported as a directory", () => {
    expect(checkPath("/feed.xml", files("feed.xml/index.html")).status).toBe(
      "shape-changed",
    );
  });

  it("reports missing paths", () => {
    expect(checkPath("/robots.txt", files())).toMatchObject({
      status: "missing",
      file: null,
    });
  });
});

describe("site paths and project-site prefixes", () => {
  it("keeps only this host", () => {
    expect(toSitePath(`${ORIGIN}/about/`)).toBe("/about/");
    expect(toSitePath("/blog/")).toBe("/blog/");
    expect(toSitePath("https://example.com/x/")).toBeNull();
    expect(toSitePath("http://[bad")).toBeNull();
  });

  it("matches a prefix with and without its trailing slash", () => {
    const prefixes = ["/energlens/"];
    expect(isProjectSitePath("/energlens/", prefixes)).toBe(true);
    expect(isProjectSitePath("/energlens", prefixes)).toBe(true);
    expect(isProjectSitePath("/energlens/x.png", prefixes)).toBe(true);
    expect(isProjectSitePath("/energlensx/", prefixes)).toBe(false);
  });

  it("turns has_pages repos into prefixes, skipping the user site", () => {
    expect(
      pagesPrefixes([
        { name: "llevintza.github.io", has_pages: true },
        { name: "demo", has_pages: true },
        { name: "lib", has_pages: false },
      ]),
    ).toEqual(["/demo/"]);
  });
});

describe("feed parsing", () => {
  it("reads sitemap locs", () => {
    expect(extractSitemapLocs(SITEMAP)).toContain(`${ORIGIN}/about/`);
  });

  it("reads the feed identity and entry permalinks", () => {
    const feed = parseFeed(FEED);
    expect(feed.identity).toEqual({
      id: `${ORIGIN}/feed.xml`,
      selfLink: `${ORIGIN}/feed.xml`,
    });
    expect(feed.entryLinks).toEqual([
      `${ORIGIN}/blog/2026/01/02/hello-world/`,
      "/blog/2026/03/04/a&b/",
    ]);
  });

  it("compares a new feed with the baseline identity", () => {
    const base = { id: `${ORIGIN}/feed.xml`, selfLink: `${ORIGIN}/feed.xml` };
    expect(checkFeedIdentity(FEED, base)).toEqual([]);
    const moved = FEED.replace(`<id>${ORIGIN}/feed.xml</id>`, "<id>urn:x</id>");
    expect(checkFeedIdentity(moved, base)).toHaveLength(1);
  });
});

describe("parseBaseline", () => {
  const valid = {
    generatedAt: "2026-11-10T00:00:00.000Z",
    source: ORIGIN,
    paths: ["/", "/blog/"],
    feed: null,
  };

  it("accepts a valid baseline", () => {
    expect(parseBaseline(JSON.stringify(valid))).toEqual(valid);
  });

  it.each([
    ["bad JSON", "{"],
    ["no date", JSON.stringify({ ...valid, generatedAt: "soon" })],
    ["empty paths", JSON.stringify({ ...valid, paths: [] })],
    ["relative path", JSON.stringify({ ...valid, paths: ["blog/"] })],
    ["bad feed", JSON.stringify({ ...valid, feed: { id: 1 } })],
  ])("rejects %s", (_name, raw) => {
    expect(() => parseBaseline(raw)).toThrow();
  });
});

describe("buildBaseline", () => {
  const respond = (status: number, body: unknown = "") => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => String(body),
    json: async () => body,
  });

  function fakeFetch(
    api: number | unknown[] = [{ name: "demo", has_pages: true }],
  ) {
    return vi.fn(async (url: string) => {
      if (url.startsWith("https://api.github.com/"))
        return typeof api === "number" ? respond(api) : respond(200, api);
      const path = url.slice(ORIGIN.length);
      if (path === "/sitemap.xml") return respond(200, SITEMAP);
      if (path === "/feed.xml") return respond(200, FEED);
      if (path === "/robots.txt") return respond(404);
      return respond(200, "<html></html>");
    });
  }

  it("collects sitemap, feed and seed paths, minus project sites", async () => {
    const fetchFn = fakeFetch([
      { name: "demo", has_pages: true },
      { name: "about", has_pages: true },
    ]);
    const { baseline, prefixes, excluded } = await buildBaseline({
      fetchFn,
      now: new Date("2026-11-10T00:00:00Z"),
    });
    expect(baseline.generatedAt).toBe("2026-11-10T00:00:00.000Z");
    expect(prefixes).toContain("/demo/");
    expect(prefixes).toContain("/email-icons/");
    // A Pages repo named after a route shadows it.
    expect(excluded).toEqual(
      expect.arrayContaining(["/energlens/", "/about/"]),
    );
    expect(baseline.paths).toEqual(
      expect.arrayContaining([
        "/",
        "/blog/",
        "/feed.xml",
        "/sitemap.xml",
        "/404.html",
        "/blog/2026/01/02/hello-world/",
      ]),
    );
    expect(baseline.paths).not.toContain("/robots.txt");
    expect(baseline.paths).not.toContain("/energlens/");
    expect(baseline.paths).not.toContain("/about/");
    expect(baseline.feed?.id).toBe(`${ORIGIN}/feed.xml`);
  });

  it("falls back to the committed prefix list when the API fails", async () => {
    const log = vi.fn();
    const { prefixes, baseline } = await buildBaseline({
      fetchFn: fakeFetch(403),
      log,
    });
    expect(prefixes).toEqual([
      "/credit-desk-analytics/",
      "/email-icons/",
      "/energlens/",
      "/instrument-price-dashboard/",
    ]);
    expect(baseline.paths).toContain("/blog/");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("fallback"));
  });

  it("sends the token to the authenticated repos endpoint", async () => {
    const fetchFn = fakeFetch();
    await buildBaseline({ fetchFn, githubToken: "test-token" });
    const apiCall = fetchFn.mock.calls.find(([u]) =>
      String(u).startsWith("https://api.github.com/"),
    ) as unknown as [string, { headers: Record<string, string> }];
    expect(apiCall[0]).toContain("/user/repos");
    expect(apiCall[1].headers.authorization).toBe("Bearer test-token");
  });
});
