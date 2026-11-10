/** Posts per index page. Page 1 lives at the list's base URL. */
export const PAGE_SIZE = 10;

export interface Page<T> {
  items: T[];
  /** 1-based page number. */
  page: number;
  totalPages: number;
  /** URL of the previous (newer) page, or `undefined` on page 1. */
  prevHref?: string;
  /** URL of the next (older) page, or `undefined` on the last page. */
  nextHref?: string;
}

/** Number of pages for `total` items. An empty list still has one page. */
export function pageCount(total: number, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/**
 * URL of page `n` of a list whose page 1 is `base` (with a trailing slash):
 * `pageHref("/blog/", 1)` is `/blog/`, `pageHref("/blog/", 2)` is
 * `/blog/page/2/`. There is no `/blog/page/1/`.
 */
export function pageHref(base: string, n: number): string {
  return n === 1 ? base : `${base}page/${n}/`;
}

/**
 * Page `page` (1-based) of `items`, or `undefined` if that page doesn't exist.
 * Page 1 always exists, even for an empty list.
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  base: string,
  size: number = PAGE_SIZE,
): Page<T> | undefined {
  const totalPages = pageCount(items.length, size);
  if (!Number.isInteger(page) || page < 1 || page > totalPages) {
    return undefined;
  }
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    page,
    totalPages,
    prevHref: page > 1 ? pageHref(base, page - 1) : undefined,
    nextHref: page < totalPages ? pageHref(base, page + 1) : undefined,
  };
}

/**
 * Page numbers that need their own `/page/<n>/` route: 2 and up. Page 1 is
 * the base URL, so it's never listed.
 */
export function extraPageNumbers(
  total: number,
  size: number = PAGE_SIZE,
): number[] {
  const pages = pageCount(total, size);
  return Array.from({ length: pages - 1 }, (_, i) => i + 2);
}

/**
 * Parses a `[n]` route param. Only canonical numbers of 2 or more are valid,
 * so `1`, `02` and `abc` return `undefined`.
 */
export function parsePageParam(value: string): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const n = Number(value);
  return n >= 2 ? n : undefined;
}

/**
 * Route param value that never matches a real page or tag (tags can't
 * contain `_`, page numbers are digits).
 */
export const PLACEHOLDER_PARAM = "_";

/**
 * `output: "export"` fails the build when `generateStaticParams` returns an
 * empty array, which is the normal case for `/page/[n]/` while there are 10
 * posts or fewer. In that case return one placeholder route instead; its page
 * calls `notFound()`, so nothing real is published at that URL.
 *
 * The export still writes a file there (e.g. `out/blog/page/_/index.html`),
 * which GitHub Pages serves with HTTP 200 as a noindex soft 404. Never list
 * `PLACEHOLDER_PARAM` paths in a sitemap or feed, and never link to them.
 */
export function orPlaceholder<P extends Record<string, string>>(
  params: P[],
  placeholder: P,
): P[] {
  return params.length > 0 ? params : [placeholder];
}
