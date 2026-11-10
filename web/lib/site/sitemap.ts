import fs from "node:fs";
import path from "node:path";

import type { MetadataRoute } from "next";

import { getAllPosts, getAllTags, type LoadOptions } from "@/lib/content/posts";

import { absoluteUrl } from "./metadata";

/** Pages that always exist. Paths with a trailing slash, like every route. */
export const STATIC_ROUTES = ["/", "/about/", "/projects/", "/blog/"] as const;

export interface SitemapOptions {
  /** The `app/` directory, used to see which optional routes exist. */
  appDir?: string;
  /** Where project case studies live (`<slug>.mdx`). */
  projectsDir?: string;
  /** Passed to `getAllPosts`; drafts are left out unless this says otherwise. */
  posts?: LoadOptions;
}

const APP_DIR = path.join(process.cwd(), "app");
const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");

/** Case-study files are named after their slug (enforced by #24's parser). */
const CASE_STUDY_RE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/;

function routeExists(appDir: string, ...segments: string[]): boolean {
  return fs.existsSync(path.join(appDir, ...segments, "page.tsx"));
}

/**
 * Every URL in the static export. Tag pages (#16) and project case studies
 * (#24) are only listed when their route exists, so this works before and
 * after those PRs merge.
 */
export function buildSitemap({
  appDir = APP_DIR,
  projectsDir = PROJECTS_DIR,
  posts: postOptions = { includeDrafts: false },
}: SitemapOptions = {}): MetadataRoute.Sitemap {
  const posts = getAllPosts(postOptions);
  const newest = posts[0]?.date;

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    ...(route === "/blog/" && newest ? { lastModified: newest } : {}),
  }));

  for (const post of posts) {
    entries.push({ url: absoluteUrl(post.permalink), lastModified: post.date });
  }

  if (routeExists(appDir, "blog", "tags")) {
    entries.push({ url: absoluteUrl("/blog/tags/") });
  }
  if (routeExists(appDir, "blog", "tags", "[tag]")) {
    for (const { tag } of getAllTags(postOptions)) {
      entries.push({ url: absoluteUrl(`/blog/tags/${tag}/`) });
    }
  }

  if (routeExists(appDir, "projects", "[slug]") && fs.existsSync(projectsDir)) {
    const slugs = fs
      .readdirSync(projectsDir)
      .map((name) => CASE_STUDY_RE.exec(name)?.[1])
      .filter((slug): slug is string => Boolean(slug))
      .sort();
    for (const slug of slugs) {
      entries.push({ url: absoluteUrl(`/projects/${slug}/`) });
    }
  }

  return entries;
}
