import { describe, expect, it } from "vitest";

import { LATEST_POSTS, latestPosts } from "./latest-posts-section";

describe("latestPosts", () => {
  it("lists between 3 and 5 posts at most", () => {
    expect(LATEST_POSTS).toBeGreaterThanOrEqual(3);
    expect(LATEST_POSTS).toBeLessThanOrEqual(5);
  });

  it("keeps the newest first and caps the count", () => {
    const posts = ["g", "f", "e", "d", "c", "b", "a"];
    expect(latestPosts(posts)).toEqual(["g", "f", "e", "d", "c"]);
    expect(latestPosts(posts.slice(0, 2))).toEqual(["g", "f"]);
  });
});
