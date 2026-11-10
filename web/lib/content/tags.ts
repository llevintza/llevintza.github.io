import type { PostMeta } from "./posts";

export const BLOG_BASE = "/blog/";

/** `/blog/tags/<tag>/`. Tags are already URL-safe (lowercase, hyphenated). */
export function tagHref(tag: string): string {
  return `${BLOG_BASE}tags/${tag}/`;
}

/**
 * Posts grouped by tag, keeping the input order within each tag (pass them
 * newest first). A post that repeats a tag is listed once under it. Tags are
 * in alphabetical order.
 */
export function groupPostsByTag<T extends Pick<PostMeta, "tags">>(
  posts: readonly T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const post of posts) {
    for (const tag of new Set(post.tags)) {
      const group = groups.get(tag);
      if (group) group.push(post);
      else groups.set(tag, [post]);
    }
  }
  return new Map([...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
