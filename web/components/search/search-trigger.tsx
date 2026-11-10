"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";

import {
  isApplePlatform,
  isPaletteShortcut,
  isSlashShortcut,
  isTypingTarget,
} from "./helpers";

// The dialog (and Pagefind behind it) is a separate chunk, fetched only when
// the palette first opens, so pages ship just this small trigger.
const loadDialog = () => import("./search-dialog");
const SearchDialog = dynamic(loadDialog, { ssr: false });

const subscribe = () => () => {};

/** null during static render and hydration, then whether this is a Mac. */
function useApplePlatform(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      const nav = navigator as Navigator & {
        userAgentData?: { platform?: string };
      };
      return isApplePlatform(nav.userAgentData?.platform || nav.platform);
    },
    () => null,
  );
}

/**
 * Header search button (#19). Opens the command palette on click, on Cmd+K
 * (Mac) or Ctrl+K (elsewhere), and on `/` when focus isn't in a text field.
 * Like the theme toggle it keeps its box but stays invisible until hydration,
 * because search needs JavaScript.
 */
export function SearchTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const apple = useApplePlatform();
  const mounted = apple !== null;

  // Focus goes back to the button after the dialog has unmounted: while a
  // modal <dialog> is still open the rest of the page is inert.
  const restoreFocus = useRef(false);
  const close = useCallback(() => {
    restoreFocus.current = true;
    setOpen(false);
  }, []);
  useEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    buttonRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (apple === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (isPaletteShortcut(event)) {
        event.preventDefault();
        // Toggle; closing goes through `close` so focus returns to the button.
        if (open) close();
        else setOpen(true);
      } else if (
        isSlashShortcut(event) &&
        !isTypingTarget(document.activeElement as HTMLElement | null)
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [apple, open, close]);

  const preload = () => void loadDialog();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={preload}
        onFocus={preload}
        disabled={!mounted}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K /"
        title={mounted ? `Search (${apple ? "⌘K" : "Ctrl+K"} or /)` : undefined}
        className={cn(
          "inline-flex min-h-9 items-center gap-2 border border-line bg-panel px-2.5 font-mono text-sm leading-none text-ink transition-colors hover:border-accent hover:text-head",
          focusRing,
          !mounted && "invisible",
          className,
        )}
      >
        {/* Phones get a magnifier only, to leave room in the header. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4 text-accent sm:hidden"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
        <span aria-hidden="true" className="hidden text-accent sm:inline">
          &gt;
        </span>
        <span className="sr-only sm:not-sr-only">search</span>
        {/* Fixed width so the label swap after hydration can't shift layout. */}
        <kbd
          aria-hidden="true"
          className="hidden w-[7ch] border border-line px-1 py-0.5 text-center font-mono text-xs whitespace-nowrap text-muted lg:inline-block"
        >
          {apple === null ? "" : apple ? "⌘K" : "ctrl K"}
        </kbd>
      </button>
      {open ? <SearchDialog onClose={close} /> : null}
    </>
  );
}
