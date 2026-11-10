import { describe, expect, it } from "vitest";
import {
  alternateOutFile,
  checkFeedIdentity,
  checkPath,
  exportedProjectPrefixes,
  parseBaseline,
  parseFeed,
  pathToOutFile,
} from "./url-parity";

const ORIGIN = "https://llevintza.github.io";

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

describe("feed parsing", () => {
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

describe("exportedProjectPrefixes", () => {
  it("reports an out/<prefix>/ tree, checked relative to out/", () => {
    const seen: string[] = [];
    const exists = (rel: string) => {
      seen.push(rel);
      return rel === "email-icons";
    };
    expect(
      exportedProjectPrefixes(["/email-icons/", "/energlens/"], exists),
    ).toEqual(["/email-icons/"]);
    expect(seen).toEqual(["email-icons", "energlens"]);
  });
});
