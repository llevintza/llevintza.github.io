import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseFrontmatter } from "./frontmatter";
import {
  ContentError,
  comparePosts,
  getAllPosts,
  getAllTags,
  getPostBySlug,
  parsePost,
  permalinkFor,
  postParams,
} from "./posts";
import { readingTime } from "./reading-time";

const fixtures = path.join(import.meta.dirname, "../../content/__fixtures__");
const postsDir = path.join(fixtures, "posts");

function post(frontmatter: string, body = "Body text.") {
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

const valid = [
  "title: Hello",
  "date: 2026-11-09",
  "tags: [a, b]",
  "summary: A post.",
].join("\n");

describe("frontmatter validation", () => {
  it("accepts valid frontmatter and defaults draft to false", () => {
    const { frontmatter, body } = parseFrontmatter("x.mdx", post(valid));
    expect(frontmatter).toEqual({
      title: "Hello",
      date: "2026-11-09",
      tags: ["a", "b"],
      summary: "A post.",
      draft: false,
    });
    expect(body.trim()).toBe("Body text.");
  });

  it("keeps the date a string (YAML must not turn it into a Date)", () => {
    const { frontmatter } = parseFrontmatter("x.mdx", post(valid));
    expect(typeof frontmatter.date).toBe("string");
  });

  it("names the file and the missing field", () => {
    expect(() =>
      getAllPosts({ dir: path.join(fixtures, "missing-field") }),
    ).toThrowError(
      /Invalid frontmatter in .*2026-01-01-no-summary\.mdx:\n {2}- summary: is required/,
    );
  });

  it("rejects an impossible calendar date", () => {
    expect(() =>
      getAllPosts({ dir: path.join(fixtures, "bad-date") }),
    ).toThrowError(
      /2026-02-30-bad-date\.mdx:\n {2}- date: is not a real calendar date: "2026-02-30"/,
    );
  });

  it("rejects a badly formatted date", () => {
    const source = post(valid.replace("2026-11-09", "11/09/2026"));
    expect(() => parseFrontmatter("x.mdx", source)).toThrowError(
      /date: must be YYYY-MM-DD, got "11\/09\/2026"/,
    );
  });

  it("requires lowercase, hyphenated tags", () => {
    const source = post(
      valid.replace("tags: [a, b]", "tags: [Next.js, ok-tag]"),
    );
    expect(() => parseFrontmatter("x.mdx", source)).toThrowError(
      /tags.0: must be lowercase and hyphenated .*got "Next.js"/,
    );
  });

  it("rejects wrong types and unknown fields", () => {
    const source = post(`${valid.replace("tags: [a, b]", "tags: a")}\ntag: b`);
    expect(() => parseFrontmatter("x.mdx", source)).toThrowError(ContentError);
    expect(() => parseFrontmatter("x.mdx", source)).toThrowError(
      /tags: must be a list of strings, got "a"/,
    );
    expect(() => parseFrontmatter("x.mdx", source)).toThrowError(
      /unknown field\(s\): tag/,
    );
  });

  it("requires a frontmatter block", () => {
    expect(() => parseFrontmatter("x.mdx", "# No frontmatter")).toThrowError(
      /missing frontmatter/,
    );
  });

  it("rejects a frontmatter date that differs from the file name", () => {
    expect(() => parsePost("2026-11-08-hello.mdx", post(valid))).toThrowError(
      /2026-11-09 does not match the date in the file name \(2026-11-08\)/,
    );
  });
});

describe("slugs and permalinks", () => {
  it("takes the slug from the file name, Jekyll style", () => {
    const parsed = parsePost(
      "content/posts/2026-11-09-my-post.mdx",
      post(valid),
    );
    expect(parsed.slug).toBe("my-post");
    expect(parsed.params).toEqual({
      year: "2026",
      month: "11",
      day: "09",
      slug: "my-post",
    });
    expect(parsed.permalink).toBe("/blog/2026/11/09/my-post/");
  });

  it("builds /blog/:year/:month/:day/:slug/ with zero-padded parts", () => {
    expect(permalinkFor(postParams("2026-01-05", "x"))).toBe(
      "/blog/2026/01/05/x/",
    );
  });

  it("rejects file names that don't follow YYYY-MM-DD-slug.mdx", () => {
    for (const name of [
      "my-post.mdx",
      "2026-11-09-My_Post.mdx",
      "2026-11-09-.mdx",
    ]) {
      expect(() => parsePost(name, post(valid))).toThrowError(
        /Invalid post file name/,
      );
    }
  });
});

describe("draft filtering", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("leaves drafts out when includeDrafts is false", () => {
    const slugs = getAllPosts({ dir: postsDir, includeDrafts: false }).map(
      (p) => p.slug,
    );
    expect(slugs).toEqual(["second-post", "first-post"]);
    expect(
      getPostBySlug("unfinished", { dir: postsDir, includeDrafts: false }),
    ).toBeUndefined();
  });

  it("keeps drafts when includeDrafts is true", () => {
    const posts = getAllPosts({ dir: postsDir, includeDrafts: true });
    expect(posts.map((p) => p.slug)).toContain("unfinished");
    expect(posts.find((p) => p.slug === "unfinished")?.draft).toBe(true);
  });

  it("defaults to hiding drafts in production and showing them in dev", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getAllPosts({ dir: postsDir }).some((p) => p.draft)).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(getAllPosts({ dir: postsDir }).some((p) => p.draft)).toBe(true);
  });

  it("counts tags from published posts only", () => {
    expect(getAllTags({ dir: postsDir, includeDrafts: false })).toEqual([
      { tag: "testing", count: 2 },
      { tag: "nextjs", count: 1 },
    ]);
  });
});

describe("sort order", () => {
  it("returns posts newest first", () => {
    const dates = getAllPosts({ dir: postsDir, includeDrafts: true }).map(
      (p) => p.date,
    );
    expect(dates).toEqual(["2026-02-01", "2026-01-15", "2025-12-01"]);
  });

  it("orders same-day posts by slug", () => {
    const a = parsePost("2026-11-09-b.mdx", post(valid));
    const b = parsePost("2026-11-09-a.mdx", post(valid));
    const c = parsePost("2026-11-08-z.mdx", post(valid.replace("09", "08")));
    expect([a, c, b].sort(comparePosts).map((p) => p.slug)).toEqual([
      "a",
      "b",
      "z",
    ]);
  });
});

describe("reading time", () => {
  it("rounds up to whole minutes, at least one", () => {
    expect(readingTime("one two three")).toEqual({ words: 3, minutes: 1 });
    expect(readingTime("word ".repeat(401)).minutes).toBe(3);
  });

  it("ignores Markdown punctuation and MDX imports", () => {
    expect(readingTime("import X from 'x'\n\n## Heading\n\n- item").words).toBe(
      2,
    );
  });
});
