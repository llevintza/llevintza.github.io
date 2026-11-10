import path from "node:path";
import { describe, expect, it } from "vitest";

import { getAllPosts } from "./posts";
import { groupPostsByTag, tagHref } from "./tags";

const fixtures = path.join(
  import.meta.dirname,
  "../../content/__fixtures__/posts",
);

const post = (slug: string, tags: string[]) => ({ slug, tags });

describe("tagHref", () => {
  it("builds /blog/tags/<tag>/", () => {
    expect(tagHref("next-js")).toBe("/blog/tags/next-js/");
  });
});

describe("groupPostsByTag", () => {
  it("lists each post under every one of its tags, keeping input order", () => {
    const posts = [
      post("newest", ["mdx", "nextjs"]),
      post("middle", ["nextjs"]),
      post("oldest", ["mdx"]),
    ];
    const groups = groupPostsByTag(posts);
    expect(groups.get("mdx")?.map((p) => p.slug)).toEqual(["newest", "oldest"]);
    expect(groups.get("nextjs")?.map((p) => p.slug)).toEqual([
      "newest",
      "middle",
    ]);
  });

  it("sorts tags alphabetically", () => {
    const groups = groupPostsByTag([post("a", ["zeta", "alpha", "mid"])]);
    expect([...groups.keys()]).toEqual(["alpha", "mid", "zeta"]);
  });

  it("lists a post once even if it repeats a tag", () => {
    const groups = groupPostsByTag([post("a", ["mdx", "mdx"])]);
    expect(groups.get("mdx")).toHaveLength(1);
  });

  it("has no groups for posts without tags", () => {
    expect(groupPostsByTag([post("a", [])]).size).toBe(0);
    expect(groupPostsByTag([]).size).toBe(0);
  });

  it("groups the fixture posts newest first and skips drafts", () => {
    const groups = groupPostsByTag(
      getAllPosts({ dir: fixtures, includeDrafts: false }),
    );
    expect([...groups.keys()]).toEqual(["nextjs", "testing"]);
    expect(groups.get("testing")?.map((p) => p.slug)).toEqual([
      "second-post",
      "first-post",
    ]);
    expect(groups.has("drafts")).toBe(false);
  });
});
