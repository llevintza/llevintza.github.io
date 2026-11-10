import type { CSSProperties } from "react";

import { building, npmPackage } from "./content";
import styles from "./hero.module.css";

/** Stagger for the one-shot "print" reveal (no-op under reduced motion). */
const printAt = (i: number, delayMs = 300) =>
  ({ "--i": i, "--delay": `${delayMs}ms` }) as CSSProperties;

/**
 * A console window listing what Leo is building now (#60 §5). Text only:
 * private repos are named and never linked, so the panel has no links at
 * all. Rows print in line by line once; with reduced motion they are all
 * there from the start. `mt-0` opts out of the base `* + section` spacing:
 * the hero grid's gap already separates it from the intro.
 */
export function TerminalPanel() {
  const npmRow = building.length + 2;

  return (
    <section
      aria-labelledby="hero-building-title"
      className="mt-0 border border-line bg-panel shadow-hard"
    >
      <div className="flex items-center justify-between gap-4 bg-titlebar-bg px-3 py-2 font-pixel text-chrome text-titlebar-ink">
        <h2
          id="hero-building-title"
          className="font-pixel text-chrome text-titlebar-ink"
        >
          <span className="sr-only">Currently building</span>
          <span aria-hidden="true">zsh — leo@site: ~/building</span>
        </h2>
        <span aria-hidden="true" className="mt-0 tracking-widest">
          [_][□][x]
        </span>
      </div>

      <div className="px-3 py-4 font-mono text-[0.75rem] leading-[1.7] sm:px-5 sm:py-5 sm:text-sm">
        <p className="text-muted">
          <span className="text-accent" aria-hidden="true">
            ${" "}
          </span>
          ls ~/building
        </p>
        <ul className="mt-2">
          {building.map((entry, i) => (
            <li
              key={entry.repo}
              className={`${styles.print} flex flex-wrap items-baseline gap-x-2`}
              style={printAt(i + 1)}
            >
              <span className="text-head">
                {entry.repo}
                {entry.private ? (
                  <>
                    <span className="text-accent" aria-hidden="true">
                      *
                    </span>
                    <span className="sr-only"> (private)</span>
                  </>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className="min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-muted/50"
              />
              <span className="ml-auto text-muted">{entry.status}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-muted" aria-hidden="true">
          <span className="text-accent">*</span> private: source on request
        </p>

        <p
          className={`${styles.print} mt-4 break-words text-muted`}
          style={printAt(npmRow)}
        >
          <span className="text-accent" aria-hidden="true">
            ${" "}
          </span>
          npm view {npmPackage.name}
        </p>
        <p className={`${styles.print} mt-0`} style={printAt(npmRow + 1)}>
          <span className="text-ok" aria-hidden="true">
            ✓{" "}
          </span>
          <span className="sr-only">Published: </span>v{npmPackage.version} ·{" "}
          {npmPackage.licence}
          <span className="cursor-block" aria-hidden="true" />
        </p>
      </div>
    </section>
  );
}
