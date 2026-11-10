"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";

import { dateFromUrl, moveActive, parseExcerpt, resultKind } from "./helpers";
import {
  loadPagefind,
  searchSite,
  type Pagefind,
  type PagefindResultData,
} from "./pagefind";
import styles from "./search.module.css";

type Results = { term: string; items: PagefindResultData[] };

/**
 * Console-style command palette (#19): a modal <dialog> with a `>` prompt.
 * The input is a combobox over a listbox of results: arrow keys move the
 * active result, Enter opens it, Esc (or a backdrop click) closes. Pagefind
 * loads when the dialog mounts, never before.
 */
export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = useId();
  const listId = `${ids}-results`;
  const optionId = (i: number) => `${ids}-option-${i}`;

  const [pagefind, setPagefind] = useState<Pagefind | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>({ term: "", items: [] });
  const [active, setActive] = useState(-1);

  const term = query.trim();
  const items = term ? results.items : [];
  const searching = term !== "" && pagefind !== null && results.term !== term;

  // Open as a modal (the rest of the page goes inert) and load Pagefind.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    inputRef.current?.focus();
    let cancelled = false;
    loadPagefind().then(
      (pf) => !cancelled && setPagefind(pf),
      () => !cancelled && setLoadFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Search as the query changes (Pagefind debounces and drops stale calls).
  useEffect(() => {
    if (!pagefind || !term) return;
    let cancelled = false;
    searchSite(pagefind, term).then(
      (found) => {
        if (cancelled || found === null) return;
        setResults({ term, items: found });
        setActive(found.length ? 0 : -1);
      },
      () => {
        if (!cancelled) setResults({ term, items: [] });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [pagefind, term]);

  // Keep the active result visible while arrowing through a long list.
  useEffect(() => {
    if (active < 0) return;
    document
      .getElementById(optionId(active))
      ?.scrollIntoView({ block: "nearest" });
    // optionId only depends on the stable useId value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const close = () => dialogRef.current?.close();

  const open = (url: string) => {
    close();
    router.push(url);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) =>
        moveActive(i, event.key === "ArrowDown" ? 1 : -1, items.length),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[active];
      if (item) open(item.url);
    }
  };

  // Keep Tab inside the dialog (showModal already makes the page inert).
  const onDialogKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const focusables = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "input, button:not([disabled])",
      ) ?? [],
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // A click on the backdrop lands on the <dialog> itself.
  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close();
  };

  let status: string;
  if (loadFailed) {
    status = "Search index unavailable. Run `pnpm build` to create it.";
  } else if (!pagefind) {
    status = "Loading search index…";
  } else if (!term) {
    status = "Type to search posts and projects.";
  } else if (searching && results.term === "") {
    status = "Searching…";
  } else if (items.length === 0) {
    status = searching ? "Searching…" : `No results for “${term}”.`;
  } else {
    status = `${items.length} result${items.length === 1 ? "" : "s"}.`;
  }

  return (
    // The dialog's own handlers implement Tab looping and backdrop close;
    // keyboard users close it with Esc (native) or the esc button.

    <dialog
      ref={dialogRef}
      aria-labelledby={`${ids}-title`}
      onClose={onClose}
      onKeyDown={onDialogKeyDown}
      onClick={onDialogClick}
      className={cn(
        styles.dialog,
        "m-0 mx-auto mt-[10vh] flex max-h-[min(36rem,80dvh)] w-[min(40rem,calc(100vw-2rem))] max-w-none flex-col border border-line bg-panel p-0 text-ink shadow-hard",
      )}
    >
      <h2 id={`${ids}-title`} className="sr-only">
        Search the site
      </h2>

      <div className="flex items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
        <span aria-hidden="true" className="font-mono text-lg text-accent">
          &gt;
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          role="combobox"
          aria-label="Search posts and projects"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 && items[active] ? optionId(active) : undefined
          }
          placeholder="search posts and projects"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          className={cn(
            styles.input,
            "min-h-10 min-w-0 flex-1 bg-transparent font-mono text-base text-head caret-accent placeholder:text-muted focus:outline-none",
          )}
        />
        <button
          type="button"
          onClick={close}
          className={cn(
            "border border-line px-2 py-1 font-mono text-xs text-muted hover:border-accent hover:text-head",
            focusRing,
          )}
        >
          esc
          <span className="sr-only"> (close search)</span>
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="px-3 pt-2 font-mono text-xs text-muted sm:px-4"
      >
        {status}
      </p>

      <ul
        id={listId}
        role="listbox"
        aria-label="Results"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
      >
        {items.map((item, i) => {
          const date = dateFromUrl(item.url);
          const selected = i === active;
          return (
            // Options are activated through the combobox (Enter); the click
            // handler serves pointer users.

            <li
              key={item.url}
              id={optionId(i)}
              role="option"
              aria-selected={selected}
              onClick={() => open(item.url)}
              onMouseMove={() => setActive(i)}
              className={cn(
                "cursor-pointer border-l-2 px-3 py-2",
                selected ? "border-accent bg-panel-2" : "border-transparent",
              )}
            >
              <span className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs text-muted">
                <span className="text-accent">{resultKind(item.url)}</span>
                {date ? <time dateTime={date}>{date}</time> : null}
                <span className="truncate">{item.url}</span>
              </span>
              <span className="mt-0.5 block font-mono text-sm font-semibold text-head">
                {item.meta.title ?? item.url}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink">
                {parseExcerpt(item.excerpt).map((part, j) =>
                  part.match ? (
                    <mark key={j} className={styles.mark}>
                      {part.text}
                    </mark>
                  ) : (
                    <span key={j}>{part.text}</span>
                  ),
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p
        aria-hidden="true"
        className="hidden gap-4 border-t border-line px-4 py-2 font-mono text-xs text-muted sm:flex"
      >
        <span>↑↓ move</span>
        <span>↵ open</span>
        <span>esc close</span>
        <span className="ml-auto">pagefind</span>
      </p>
    </dialog>
  );
}
