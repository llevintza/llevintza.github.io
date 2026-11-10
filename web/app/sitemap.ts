import type { MetadataRoute } from "next";

import { buildSitemap } from "@/lib/site/sitemap";

// Static export: written once to out/sitemap.xml at build time.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
