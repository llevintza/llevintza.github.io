import type { PostMeta } from "@/lib/content/posts";

/** Feed-level settings. Defaults mirror the Jekyll `_config.yml`. */
export interface FeedSite {
  /** Absolute origin without a trailing slash: `https://llevintza.github.io`. */
  url: string;
  title: string;
  subtitle: string;
  author: string;
}

/**
 * Same values jekyll-feed publishes today, so readers subscribed to the
 * Jekyll feed see the same feed (same `<id>`, same self link) after cutover.
 */
export const SITE: FeedSite = {
  url: "https://llevintza.github.io",
  title: "Leo Levintza",
  subtitle:
    "Principal Software Engineer · Distributed Systems · Cloud-Native Backends · Agentic AI Tooling & AI-Augmented SDLC · New York Metro Area",
  author: "Leo Levintza",
};

/** Where the feed is served, relative to the site root. */
export const FEED_PATH = "/feed.xml";

/** jekyll-feed's default: the 10 newest posts. */
export const FEED_LIMIT = 10;

export type FeedPost = Pick<
  PostMeta,
  "title" | "date" | "tags" | "summary" | "permalink"
>;

export interface BuildFeedOptions {
  site?: FeedSite;
  /** Max entries; defaults to {@link FEED_LIMIT}. */
  limit?: number;
  /** Feed `<updated>` when there are no posts. Defaults to now. */
  now?: Date;
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Escapes text for XML element content and attribute values. */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

/** `2026-11-09` -> `2026-11-09T00:00:00+00:00`, jekyll-feed's date format. */
export function atomDate(date: string): string {
  return `${date}T00:00:00+00:00`;
}

function isoDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function absolute(site: FeedSite, pathname: string): string {
  return new URL(pathname, `${site.url}/`).href;
}

// Titles and summaries are plain text in frontmatter, so they go out as
// type="text" (jekyll-feed says type="html" after stripping HTML). With
// type="html", a summary that mentions `<Link>` would be read as markup.
function entry(site: FeedSite, post: FeedPost): string {
  const url = escapeXml(absolute(site, post.permalink));
  const title = escapeXml(post.title);
  const date = atomDate(post.date);
  return [
    "<entry>",
    `<title type="text">${title}</title>`,
    `<link href="${url}" rel="alternate" type="text/html" title="${title}" />`,
    `<published>${date}</published>`,
    `<updated>${date}</updated>`,
    `<id>${url}</id>`,
    `<author><name>${escapeXml(site.author)}</name></author>`,
    ...post.tags.map((tag) => `<category term="${escapeXml(tag)}" />`),
    `<summary type="text">${escapeXml(post.summary)}</summary>`,
    "</entry>",
  ].join("");
}

/**
 * Builds an Atom 1.0 feed in the same shape as jekyll-feed. `posts` must be
 * sorted newest first and exclude drafts (as `getAllPosts()` returns them in
 * production). Output is deterministic: `<updated>` is the newest post date.
 */
export function buildAtomFeed(
  posts: readonly FeedPost[],
  options: BuildFeedOptions = {},
): string {
  const site = options.site ?? SITE;
  const entries = posts.slice(0, options.limit ?? FEED_LIMIT);
  const updated = entries[0]
    ? atomDate(entries[0].date)
    : isoDateTime(options.now ?? new Date());
  const feedUrl = escapeXml(absolute(site, FEED_PATH));

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `<link href="${feedUrl}" rel="self" type="application/atom+xml" />`,
    `<link href="${escapeXml(absolute(site, "/"))}" rel="alternate" type="text/html" />`,
    `<updated>${updated}</updated>`,
    `<id>${feedUrl}</id>`,
    `<title type="text">${escapeXml(site.title)}</title>`,
    `<subtitle>${escapeXml(site.subtitle)}</subtitle>`,
    `<author><name>${escapeXml(site.author)}</name></author>`,
    ...entries.map((post) => entry(site, post)),
    "</feed>",
    "",
  ].join("\n");
}
