/*
 * Social image constants. No imports, so lib/site/metadata.ts can use them
 * without an import cycle (lib/og/card-input.ts imports from it).
 */

/** 1200x630: the size LinkedIn, X and Slack all crop least. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Each page's image is a route handler at `<page>/og.png/route.tsx`, so the
 * static export writes a real `.png` file. (Next's `opengraph-image.tsx`
 * convention exports an extension-less file, which GitHub Pages serves as
 * `application/octet-stream`, and LinkedIn and Facebook reject that.)
 */
export const OG_IMAGE_FILE = "og.png";

/** `/about/` -> `/about/og.png`; `/` -> `/og.png`. */
export function ogImagePath(pagePath: string): string {
  const withLeading = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  const dir = withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
  return `${dir}${OG_IMAGE_FILE}`;
}
