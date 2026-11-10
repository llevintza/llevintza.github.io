/**
 * Lazy loader for the Pagefind browser API (#19). The index and its JS are
 * written to `out/pagefind/` by `pnpm build`; nothing here runs until the
 * search dialog opens.
 */

/** One result's data, as returned by `result.data()` (the fields we use). */
export type PagefindResultData = {
  url: string;
  excerpt: string;
  meta: { title?: string; [key: string]: string | undefined };
};

type PagefindResult = { id: string; data: () => Promise<PagefindResultData> };

type PagefindSearch = { results: PagefindResult[] };

export type Pagefind = {
  options: (options: Record<string, unknown>) => Promise<void>;
  init: () => Promise<void>;
  /** Resolves to null when a newer call superseded this one. */
  debouncedSearch: (
    term: string,
    options?: Record<string, unknown>,
    debounceMs?: number,
  ) => Promise<PagefindSearch | null>;
};

/** Where `pagefind` writes its browser bundle inside the static export. */
export const PAGEFIND_URL = "/pagefind/pagefind.js";

let loading: Promise<Pagefind> | null = null;

/** Imports and initialises Pagefind once; a failed load can be retried. */
export function loadPagefind(): Promise<Pagefind> {
  loading ??= (async () => {
    // A runtime URL, not a module in the bundle: tell the bundlers to leave
    // this import() alone so the browser fetches it from the export.
    const url = PAGEFIND_URL;
    const pagefind = (await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ url
    )) as Pagefind;
    await pagefind.options({ excerptLength: 22 });
    await pagefind.init();
    return pagefind;
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/** Runs a search and resolves the first `limit` results' data. */
export async function searchSite(
  pagefind: Pagefind,
  term: string,
  limit = 8,
): Promise<PagefindResultData[] | null> {
  const search = await pagefind.debouncedSearch(term, {}, 120);
  if (!search) return null;
  return Promise.all(search.results.slice(0, limit).map((r) => r.data()));
}
