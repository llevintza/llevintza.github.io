import fs from "node:fs";
import path from "node:path";

import { ContentError, parseFrontmatter } from "./frontmatter";
import { readingTime, type ReadingTime } from "./reading-time";

export { ContentError } from "./frontmatter";
export type { ReadingTime } from "./reading-time";

/** Route params of `app/blog/[year]/[month]/[day]/[slug]`. */
export interface PostParams {
  year: string;
  month: string;
  day: string;
  slug: string;
}

/** Everything about a post except its body: enough for lists and feeds. */
export interface PostMeta {
  /** From the file name: `2026-11-09-my-post.mdx` -> `my-post`. */
  slug: string;
  title: string;
  /** Publication date, `YYYY-MM-DD`. */
  date: string;
  tags: string[];
  summary: string;
  draft: boolean;
  readingTime: ReadingTime;
  /** Site-relative URL with a trailing slash: `/blog/2026/11/09/my-post/`. */
  permalink: string;
  params: PostParams;
  /** Source file, relative to the app root (for error messages). */
  file: string;
}

/** A post with its raw MDX body (frontmatter stripped). */
export interface Post extends PostMeta {
  body: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface LoadOptions {
  /** Directory to read `*.mdx` from. Defaults to `content/posts`. */
  dir?: string;
  /** Defaults to true in `next dev` and false in production builds. */
  includeDrafts?: boolean;
}

export const POSTS_DIR = path.join(process.cwd(), "content", "posts");

/** `YYYY-MM-DD-slug.mdx`, the Jekyll `_posts` naming convention. */
const FILE_NAME_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/;

/** `/blog/:year/:month/:day/:slug/`, matching Jekyll's permalink setting. */
export function postParams(date: string, slug: string): PostParams {
  const [year, month, day] = date.split("-");
  return { year, month, day, slug };
}

export function permalinkFor({ year, month, day, slug }: PostParams): string {
  return `/blog/${year}/${month}/${day}/${slug}/`;
}

/** Parses and validates one post file. Throws a `ContentError` if invalid. */
export function parsePost(file: string, source: string): Post {
  const fileName = path.basename(file);
  const nameMatch = FILE_NAME_RE.exec(fileName);
  if (!nameMatch) {
    throw new ContentError(
      `Invalid post file name ${file}: expected YYYY-MM-DD-slug.mdx with a lowercase, hyphenated slug`,
    );
  }
  const [, fileDate, slug] = nameMatch;

  const { frontmatter, body } = parseFrontmatter(file, source);
  if (frontmatter.date !== fileDate) {
    throw new ContentError(
      `Invalid frontmatter in ${file}:\n  - date: ${frontmatter.date} does not match the date in the file name (${fileDate})`,
    );
  }

  const params = postParams(frontmatter.date, slug);
  return {
    ...frontmatter,
    slug,
    readingTime: readingTime(body),
    permalink: permalinkFor(params),
    params,
    file,
    body,
  };
}

/** Newest first; same-day posts by slug so the order is stable. */
export function comparePosts(a: PostMeta, b: PostMeta): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

export function filterDrafts<T extends PostMeta>(
  posts: T[],
  includeDrafts: boolean,
): T[] {
  return includeDrafts ? posts : posts.filter((post) => !post.draft);
}

const cache = new Map<string, Post[]>();

function loadPosts(dir: string): Post[] {
  // Cache in production builds only, so edits show up in `next dev`.
  const useCache = process.env.NODE_ENV === "production";
  const cached = useCache ? cache.get(dir) : undefined;
  if (cached) return cached;

  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => name.endsWith(".mdx"))
    : [];

  const posts = files.map((name) => {
    const fullPath = path.join(dir, name);
    const file = path.relative(process.cwd(), fullPath);
    return parsePost(file, fs.readFileSync(fullPath, "utf8"));
  });

  const seen = new Map<string, string>();
  for (const post of posts) {
    const other = seen.get(post.slug);
    if (other) {
      throw new ContentError(
        `Duplicate post slug "${post.slug}" in ${other} and ${post.file}`,
      );
    }
    seen.set(post.slug, post.file);
  }

  posts.sort(comparePosts);
  if (useCache) cache.set(dir, posts);
  return posts;
}

function resolve(options: LoadOptions = {}) {
  return {
    dir: options.dir ?? POSTS_DIR,
    includeDrafts:
      options.includeDrafts ?? process.env.NODE_ENV !== "production",
  };
}

/** All posts, newest first. Drafts are left out of production builds. */
export function getAllPosts(options?: LoadOptions): Post[] {
  const { dir, includeDrafts } = resolve(options);
  return filterDrafts(loadPosts(dir), includeDrafts);
}

/** The post with this slug, or `undefined` (also for drafts in production). */
export function getPostBySlug(
  slug: string,
  options?: LoadOptions,
): Post | undefined {
  return getAllPosts(options).find((post) => post.slug === slug);
}

/** Every tag with its post count, most used first, then alphabetical. */
export function getAllTags(options?: LoadOptions): TagCount[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts(options)) {
    for (const tag of new Set(post.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
