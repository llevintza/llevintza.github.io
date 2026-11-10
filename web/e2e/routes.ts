import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const OUT = path.join(__dirname, "..", "out");

/** Top-level pages, used when there is no sitemap yet. */
export const TOP_LEVEL = ["/", "/blog/", "/projects/", "/about/"];

/** Whether `out/` holds a page for this URL path. */
function isExported(urlPath: string): boolean {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, "");
  const file = path.join(OUT, rel);
  return urlPath.endsWith("/")
    ? existsSync(path.join(file, "index.html"))
    : existsSync(file) || existsSync(`${file}.html`);
}

/** Paths from `out/sitemap.xml` (added by #29), or null when there isn't one. */
function fromSitemap(): string[] | null {
  const file = path.join(OUT, "sitemap.xml");
  if (!existsSync(file)) return null;
  const xml = readFileSync(file, "utf8");
  const paths = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
    .map(([, loc]) => new URL(loc).pathname)
    // Keep only pages this export builds: the domain also serves other repos'
    // project sites (/energlens/, /email-icons/, ...), which aren't in out/.
    .filter(isExported);
  return paths.length ? paths : null;
}

/** Every `out/blog/**\/index.html` below `out/blog/` itself, as a URL path. */
function postPermalinks(): string[] {
  const blog = path.join(OUT, "blog");
  if (!existsSync(blog)) return [];
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      if (existsSync(path.join(full, "index.html"))) {
        found.push(`/${path.relative(OUT, full).split(path.sep).join("/")}/`);
      }
      walk(full);
    }
  };
  walk(blog);
  return found.sort();
}

/** The routes every e2e spec covers, deduplicated, in a stable order. */
export function getRoutes(): string[] {
  const routes = fromSitemap() ?? [...TOP_LEVEL, ...postPermalinks()];
  return [...new Set(routes)];
}

/** `/` -> `home`, `/blog/my-post/` -> `blog-my-post`. */
export function routeSlug(route: string): string {
  const slug = route
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  return slug || "home";
}
