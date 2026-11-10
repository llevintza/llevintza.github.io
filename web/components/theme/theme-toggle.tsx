"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True after hydration; false during static render and hydration. */
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Switches between dark and light and remembers the choice. Until hydration
 * (and always with JS off) the button is invisible but keeps its box, so
 * no-JS visitors never see an inert control and nothing shifts on mount. The
 * page colours themselves are already correct (set before paint).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted ? resolvedTheme : undefined;
  const next = current === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      disabled={!mounted}
      title={current ? `Switch to ${next} theme` : undefined}
      className={`inline-flex items-center gap-2 rounded-md border border-line bg-panel px-2.5 py-2 font-mono text-sm leading-none text-ink transition-colors hover:border-accent hover:text-head focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${mounted ? "" : "invisible"} ${className}`}
    >
      <span aria-hidden="true" className="text-accent">
        $
      </span>
      {/*
        The visible label is the start of the accessible name (WCAG 2.5.3,
        Label in Name): "theme: dark, switch to light".
      */}
      <span>theme: {current ?? "auto"}</span>
      {current ? <span className="sr-only">, switch to {next}</span> : null}
    </button>
  );
}
