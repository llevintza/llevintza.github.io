import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { SITE_URL } from "./metadata";
import { STATIC_ROUTES, buildSitemap } from "./sitemap";

const postsDir = path.join(
  import.meta.dirname,
  "../../content/__fixtures__/posts",
);

const tmpDirs: string[] = [];

/** A throwaway `app/` with the given route folders, each with a page.tsx. */
function fakeApp(routes: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-app-"));
  tmpDirs.push(dir);
  for (const route of routes) {
    fs.mkdirSync(path.join(dir, route), { recursive: true });
    fs.writeFileSync(path.join(dir, route, "page.tsx"), "");
  }
  return dir;
}

function fakeProjects(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-projects-"));
  tmpDirs.push(dir);
  for (const file of files) fs.writeFileSync(path.join(dir, file), "");
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function urls(options: Parameters<typeof buildSitemap>[0]) {
  return buildSitemap(options).map((entry) => entry.url);
}

describe("buildSitemap", () => {
  it("lists the static routes and published posts, not drafts", () => {
    const appDir = fakeApp([]);
    const entries = buildSitemap({
      appDir,
      posts: { dir: postsDir, includeDrafts: false },
    });

    expect(entries.map((e) => e.url)).toEqual([
      ...STATIC_ROUTES.map((route) => `${SITE_URL}${route}`),
      `${SITE_URL}/blog/2026/01/15/second-post/`,
      `${SITE_URL}/blog/2025/12/01/first-post/`,
    ]);
    expect(entries.find((e) => e.url.endsWith("/second-post/"))).toMatchObject({
      lastModified: "2026-01-15",
    });
    expect(entries.find((e) => e.url === `${SITE_URL}/blog/`)).toMatchObject({
      lastModified: "2026-01-15",
    });
    expect(entries.some((e) => e.url.includes("unfinished"))).toBe(false);
  });

  it("uses absolute URLs with trailing slashes and no duplicates", () => {
    const list = urls({
      appDir: fakeApp(["blog/tags", "blog/tags/[tag]", "projects/[slug]"]),
      projectsDir: fakeProjects(["openswim.mdx"]),
      posts: { dir: postsDir, includeDrafts: false },
    });
    for (const url of list) {
      expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(url.endsWith("/")).toBe(true);
    }
    expect(new Set(list).size).toBe(list.length);
  });

  it("skips tag pages and case studies until their routes exist", () => {
    const list = urls({
      appDir: fakeApp([]),
      projectsDir: fakeProjects(["openswim.mdx"]),
      posts: { dir: postsDir, includeDrafts: false },
    });
    expect(list.some((url) => url.includes("/tags/"))).toBe(false);
    expect(list.some((url) => url.includes("/projects/openswim/"))).toBe(false);
  });

  it("adds tag pages once the tag routes exist", () => {
    const list = urls({
      appDir: fakeApp(["blog/tags", "blog/tags/[tag]"]),
      posts: { dir: postsDir, includeDrafts: false },
    });
    const tagUrls = list.filter((url) => url.includes("/blog/tags/"));
    expect(tagUrls).toContain(`${SITE_URL}/blog/tags/`);
    expect(tagUrls.length).toBeGreaterThan(1);
    for (const url of tagUrls.slice(1)) {
      expect(url).toMatch(/\/blog\/tags\/[a-z0-9-]+\/$/);
    }
  });

  it("adds case studies once the project route exists", () => {
    const list = urls({
      appDir: fakeApp(["projects/[slug]"]),
      projectsDir: fakeProjects(["unlistd.mdx", "openswim.mdx", "notes.txt"]),
      posts: { dir: postsDir, includeDrafts: false },
    });
    expect(
      list.filter(
        (url) => url.includes("/projects/") && url !== `${SITE_URL}/projects/`,
      ),
    ).toEqual([
      `${SITE_URL}/projects/openswim/`,
      `${SITE_URL}/projects/unlistd/`,
    ]);
  });
});
