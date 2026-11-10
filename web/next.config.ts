import type { NextConfig } from "next";

// Static export for GitHub Pages: `next build` writes plain HTML to `out/`.
const nextConfig: NextConfig = {
  output: "export",
  // `/blog/` -> `out/blog/index.html`, matching the Jekyll site's URLs.
  trailingSlash: true,
  // The Next.js image optimizer needs a server; static export can't use it.
  images: { unoptimized: true },
  // Don't write an AGENTS.md on `next dev`.
  agentRules: false,
};

export default nextConfig;
