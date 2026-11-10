/* eslint-disable @typescript-eslint/no-require-imports -- LHCI loads this file with require(), so it must be CommonJS. */
// Lighthouse CI config (issue #33). Run from web/ after `pnpm build`:
//   pnpm lhci autorun
// LHCI serves ./out with its own static server, so the URLs below only need
// a path; LHCI swaps in its own host and port.
const fs = require("node:fs");
const path = require("node:path");

const OUT_DIR = path.join(__dirname, "out");

// Newest blog post in the static export: out/blog/YYYY/MM/DD/<slug>/index.html.
// Returns its URL path, or null when there is no post yet.
function newestBlogPostPath() {
  const blogDir = path.join(OUT_DIR, "blog");
  const subdirs = (dir, pattern) => {
    try {
      return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && pattern.test(d.name))
        .map((d) => d.name);
    } catch {
      return [];
    }
  };

  const posts = [];
  for (const y of subdirs(blogDir, /^\d{4}$/)) {
    for (const m of subdirs(path.join(blogDir, y), /^\d{2}$/)) {
      for (const d of subdirs(path.join(blogDir, y, m), /^\d{2}$/)) {
        for (const slug of subdirs(path.join(blogDir, y, m, d), /./)) {
          if (fs.existsSync(path.join(blogDir, y, m, d, slug, "index.html"))) {
            posts.push(`${y}/${m}/${d}/${slug}`);
          }
        }
      }
    }
  }
  if (posts.length === 0) return null;
  // Zero-padded dates sort chronologically; ties on a date sort by slug.
  posts.sort();
  return `/blog/${posts[posts.length - 1]}/`;
}

const urls = ["http://localhost/", "http://localhost/projects/"];
const post = newestBlogPostPath();
if (post) {
  urls.push(`http://localhost${post}`);
} else {
  // TODO(#15): once the first post lands, make this URL mandatory and fail
  // here instead of warning.
  console.warn(
    "[lighthouserc] WARNING: no blog post found in out/blog/YYYY/MM/DD/<slug>/; " +
      "skipping the blog post URL.",
  );
}

// Budgets are scores in 0..1, checked against the median of the runs.
const budget = (minScore) => [
  "error",
  { minScore, aggregationMethod: "median" },
];

module.exports = {
  ci: {
    collect: {
      staticDistDir: "./out",
      url: urls,
      numberOfRuns: 3,
      // Mobile emulation is Lighthouse's default; don't override formFactor.
    },
    assert: {
      assertions: {
        "categories:performance": budget(1.01),
        "categories:accessibility": budget(1),
        "categories:best-practices": budget(0.95),
        "categories:seo": budget(1),
      },
    },
    upload: {
      // The repo is private: keep reports out of temporary-public-storage.
      target: "filesystem",
      outputDir: "./.lighthouseci/reports",
    },
  },
};
