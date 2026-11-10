import { TerminalLines } from "@/components/motion";

import { building, npmPackage } from "./content";
import { heroLineDelay, npmStart, panelStart } from "./timing";

/**
 * A console window listing what Leo is building now (#60 §5). The rows come
 * from `content/featured.ts` (see `content.ts`). Text only: private repos
 * are named and never linked, so the panel has no links at all. Rows print
 * in line by line once (`<TerminalLines>`); with reduced motion they are all
 * there from the start. `mt-0` opts out of the base `* + section` spacing:
 * the hero grid's gap already separates it from the intro.
 *
 * Glyphs: stay inside the self-hosted font subsets (app/fonts/README.md,
 * "Coverage"). A glyph outside them falls through to next/font's metric
 * fallback (`local("Arial")`), which fails to load where Arial is missing
 * (e.g. Linux CI) and breaks the e2e font check.
 */
export function TerminalPanel() {
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
          [_][+][x]
        </span>
      </div>

      <div className="px-3 py-4 font-mono text-[0.75rem] leading-[1.7] sm:px-5 sm:py-5 sm:text-sm">
        <p className="text-muted">
          <span className="text-accent" aria-hidden="true">
            ${" "}
          </span>
          ls ~/building
        </p>
        <TerminalLines
          as="ul"
          className="mt-2"
          lineClassName="flex flex-wrap items-baseline gap-x-2"
          startDelay={panelStart}
          lineDelay={heroLineDelay}
        >
          {building.map((entry) => (
            <span key={entry.repo} className="contents">
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
            </span>
          ))}
        </TerminalLines>
        <p className="mt-1 text-muted" aria-hidden="true">
          <span className="text-accent">*</span> private: source on request
        </p>

        <TerminalLines
          className="mt-4"
          startDelay={npmStart(building.length)}
          lineDelay={heroLineDelay}
        >
          <p className="break-words text-muted">
            <span className="text-accent" aria-hidden="true">
              ${" "}
            </span>
            npm view {npmPackage.name}
          </p>
          <p className="mt-0">
            <span className="text-ok" aria-hidden="true">
              [ok]{" "}
            </span>
            <span className="sr-only">Published: </span>v{npmPackage.version} ·{" "}
            {npmPackage.licence}
            <span className="cursor-block" aria-hidden="true" />
          </p>
        </TerminalLines>
      </div>
    </section>
  );
}
