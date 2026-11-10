import path from "node:path";

import { XMLParser, XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";

import { getAllPosts } from "@/lib/content/posts";

import {
  atomDate,
  buildAtomFeed,
  escapeXml,
  FEED_LIMIT,
  type FeedPost,
} from "./atom";

const FIXTURES = path.join(process.cwd(), "content", "__fixtures__", "posts");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  isArray: (name) => ["entry", "category", "link"].includes(name),
});

function parseFeed(xml: string) {
  expect(XMLValidator.validate(xml)).toBe(true);
  return parser.parse(xml).feed;
}

function post(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    title: "A post",
    date: "2026-11-09",
    tags: ["nextjs"],
    summary: "A summary.",
    permalink: "/blog/2026/11/09/a-post/",
    ...overrides,
  };
}

describe("buildAtomFeed", () => {
  it("keeps the jekyll-feed id and self link so subscribers keep working", () => {
    const feed = parseFeed(buildAtomFeed([post()]));
    expect(feed["@xmlns"]).toBe("http://www.w3.org/2005/Atom");
    expect(feed.id).toBe("https://llevintza.github.io/feed.xml");
    expect(feed.link).toEqual([
      {
        "@href": "https://llevintza.github.io/feed.xml",
        "@rel": "self",
        "@type": "application/atom+xml",
      },
      {
        "@href": "https://llevintza.github.io/",
        "@rel": "alternate",
        "@type": "text/html",
      },
    ]);
    expect(feed.title["#text"]).toBe("Leo Levintza");
    expect(feed.author.name).toBe("Leo Levintza");
    expect(feed.subtitle).toMatch(/^Principal Software Engineer/);
  });

  it("writes one entry per post with absolute permalink, dates, summary and tags", () => {
    const feed = parseFeed(
      buildAtomFeed([
        post({
          title: "Rebuilding",
          tags: ["nextjs", "mdx"],
          summary: "Why the site moves.",
        }),
      ]),
    );
    const [entry] = feed.entry;
    const url = "https://llevintza.github.io/blog/2026/11/09/a-post/";
    expect(entry.id).toBe(url);
    expect(entry.link[0]["@href"]).toBe(url);
    expect(entry.link[0]["@rel"]).toBe("alternate");
    expect(entry.published).toBe("2026-11-09T00:00:00+00:00");
    expect(entry.updated).toBe("2026-11-09T00:00:00+00:00");
    expect(entry.summary["#text"]).toBe("Why the site moves.");
    expect(entry.category.map((c: { "@term": string }) => c["@term"])).toEqual([
      "nextjs",
      "mdx",
    ]);
    expect(entry.title["#text"]).toBe("Rebuilding");
  });

  it("sets the feed <updated> to the newest post date, so builds are reproducible", () => {
    const xml = buildAtomFeed([
      post({ date: "2026-11-09" }),
      post({ date: "2026-01-02" }),
    ]);
    expect(parseFeed(xml).updated).toBe("2026-11-09T00:00:00+00:00");
    expect(buildAtomFeed([post({ date: "2026-11-09" })])).toBe(
      buildAtomFeed([post({ date: "2026-11-09" })]),
    );
  });

  it("is still a valid feed with no posts", () => {
    const xml = buildAtomFeed([], { now: new Date("2026-11-10T04:15:04Z") });
    const feed = parseFeed(xml);
    expect(feed.entry).toBeUndefined();
    expect(feed.updated).toBe("2026-11-10T04:15:04+00:00");
  });

  it("caps the feed at the jekyll-feed limit, keeping the newest posts", () => {
    // Newest first, as getAllPosts() returns them: 2026-11-28, 2026-11-27, ...
    const posts = Array.from({ length: FEED_LIMIT + 5 }, (_, i) => {
      const day = String(28 - i).padStart(2, "0");
      return post({
        title: `Post ${i}`,
        date: `2026-11-${day}`,
        permalink: `/blog/2026/11/${day}/post-${i}/`,
      });
    });
    const entries = parseFeed(buildAtomFeed(posts)).entry;
    expect(entries).toHaveLength(FEED_LIMIT);
    expect(entries[0].published).toBe("2026-11-28T00:00:00+00:00");
    expect(entries[FEED_LIMIT - 1].published).toBe(
      `2026-11-${28 - FEED_LIMIT + 1}T00:00:00+00:00`,
    );
    expect(parseFeed(buildAtomFeed(posts, { limit: 3 })).entry).toHaveLength(3);
  });

  it("escapes markup in titles, summaries and tags", () => {
    const xml = buildAtomFeed([
      post({
        title: `Fish & "chips" <b>`,
        summary: "Use `<Link>` & <script>alert(1)</script>",
      }),
    ]);
    expect(xml).not.toContain("<script>");
    expect(xml).not.toContain("<b>");
    const [entry] = parseFeed(xml).entry;
    expect(entry.title["@type"]).toBe("text");
    expect(entry.summary["@type"]).toBe("text");
    expect(entry.title["#text"]).toBe(`Fish & "chips" <b>`);
  });

  it("builds from real posts, leaving drafts out", () => {
    const posts = getAllPosts({ dir: FIXTURES, includeDrafts: false });
    const feed = parseFeed(buildAtomFeed(posts));
    expect(feed.entry.map((e: { id: string }) => e.id)).toEqual([
      "https://llevintza.github.io/blog/2026/01/15/second-post/",
      "https://llevintza.github.io/blog/2025/12/01/first-post/",
    ]);
  });
});

describe("helpers", () => {
  it("escapeXml escapes the five XML special characters", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  it("atomDate formats a calendar date like jekyll-feed", () => {
    expect(atomDate("2026-11-09")).toBe("2026-11-09T00:00:00+00:00");
  });
});
