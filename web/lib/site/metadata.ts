import type { Metadata } from "next";

import { OG_CONTENT_TYPE, OG_SIZE, ogImagePath } from "@/lib/og/constants";

/** Production origin. Canonicals, Open Graph URLs and the sitemap use it. */
export const SITE_URL = "https://llevintza.github.io";

export const SITE_NAME = "Leo Levintza";

/** Author of every post and of the feed. */
export const SITE_AUTHOR = "Leo Levintza";

/**
 * Ported from the `description` in the Jekyll `_config.yml` (removed in #110;
 * see the `jekyll-legacy` branch). The Atom feed keeps it as its
 * `<subtitle>`, so the feed reads the same as the one jekyll-feed published.
 */
export const SITE_TAGLINE =
  "Principal Software Engineer · Distributed Systems · Cloud-Native Backends · Agentic AI Tooling & AI-Augmented SDLC · New York Metro Area";

/** The Atom feed, at the URL jekyll-feed used (#17). */
export const FEED_PATH = "/feed.xml";

/**
 * `<link rel="alternate" type="application/atom+xml">` for feed discovery.
 * Next.js replaces a parent's `alternates` with a page's, so both the root
 * layout and `buildMetadata` set it.
 */
export const FEED_ALTERNATE_TYPES = {
  "application/atom+xml": [
    { url: new URL(FEED_PATH, SITE_URL).href, title: SITE_NAME },
  ],
};

/** `<title>` template for every page below the root (`About · Leo Levintza`). */
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;

/** From the headline of the public `llevintza/llevintza` profile README. */
export const SITE_DESCRIPTION =
  "Leo Levintza, Principal Software Engineer: distributed systems, cloud-native backends, and agentic AI tooling for an AI-augmented SDLC.";

/**
 * Google Search Console ownership check (ADR 0002 amendment, #58): a
 * `<meta name="google-site-verification">` tag in every page head, set by the
 * root layout. No script and no cookies. The token comes only from the
 * build-time variable NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, which only the
 * Pages deploy build gets; without it (CI, Lighthouse, e2e, PR builds) no tag
 * is rendered. Never commit a token.
 */
export function siteVerification(
  google: string | undefined = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
): Metadata["verification"] {
  const token = google?.trim();
  return token ? { google: token } : undefined;
}

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
  /**
   * Social preview image (#30). `"page"` uses the page's own
   * `<path>/og.png/route.tsx`, with the full title as alt text. Leave it out
   * for the site-wide card at `/og.png`.
   */
  image?: "page" | OgImageInput;
}

export interface OgImageInput {
  /** Site-relative path to the PNG, e.g. `ogImagePath("/about/")`. */
  path: string;
  /** Describes the image for screen readers and link-preview fallbacks. */
  alt: string;
}

/** Rendered by `app/og.png/route.tsx`; used by pages without their own. */
export const DEFAULT_OG_IMAGE: OgImageInput = {
  path: ogImagePath("/"),
  alt: SITE_NAME,
};

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
 * Per-page metadata: title, description, one absolute canonical, the feed
 * discovery link, and the Open Graph and Twitter tags, including a 1200x630
 * image with its absolute URL, size, type and alt (see lib/og for how images
 * are made).
 */
export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  type = "website",
  image = DEFAULT_OG_IMAGE,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  const og =
    image === "page" ? { path: ogImagePath(path), alt: fullTitle } : image;
  const images = [
    {
      // Files keep their extension, so no trailing slash here.
      url: new URL(og.path, SITE_URL).href,
      ...OG_SIZE,
      alt: og.alt,
      type: OG_CONTENT_TYPE,
    },
  ];

  return {
    // `absolute` for the home page so the template doesn't double the name.
    title: title ?? { absolute: SITE_NAME },
    description,
    alternates: { canonical: url, types: FEED_ALTERNATE_TYPES },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      locale: "en_US",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images,
    },
  };
}
