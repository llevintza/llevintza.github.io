import type { Metadata } from "next";

/** Production origin. Canonicals, Open Graph URLs and the sitemap use it. */
export const SITE_URL = "https://llevintza.github.io";

export const SITE_NAME = "Leo Levintza";

/** `<title>` template for every page below the root (`About · Leo Levintza`). */
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;

/** From the headline of the public `llevintza/llevintza` profile README. */
export const SITE_DESCRIPTION =
  "Leo Levintza, Principal Software Engineer: distributed systems, cloud-native backends, and agentic AI tooling for an AI-augmented SDLC.";

export interface PageMetadataInput {
  /**
   * Page title without the site name; the root layout's template appends it.
   * Omit it for the home page, which uses the bare site name.
   */
  title?: string;
  /** Defaults to `SITE_DESCRIPTION`. */
  description?: string;
  /** Site-relative path, such as `/about/`. A missing trailing slash is added. */
  path: string;
  /** Open Graph type. Posts use `article`; everything else `website`. */
  type?: "website" | "article";
}

/**
 * Normalises a site-relative path to `/a/b/` form, matching
 * `trailingSlash: true` in next.config.ts and the Jekyll permalinks.
 */
export function canonicalPath(path: string): string {
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

/** Absolute URL on the production origin, with a trailing slash. */
export function absoluteUrl(path: string): string {
  return new URL(canonicalPath(path), SITE_URL).href;
}

/**
 * Per-page metadata: title, description, one absolute canonical, and the
 * Open Graph and Twitter basics.
 *
 * Social images (#30): leave `images` out here. Next.js adds `og:image` and
 * `twitter:image` from an `opengraph-image.tsx` / `twitter-image.tsx` file
 * next to a page (or in a parent segment), so #30 only has to add those files.
 * If a page needs an explicit image instead, add an `image` field to
 * `PageMetadataInput` and set `openGraph.images` / `twitter.images` from it.
 */
export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  type = "website",
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;

  return {
    // `absolute` for the home page so the template doesn't double the name.
    title: title ?? { absolute: SITE_NAME },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
    },
  };
}
