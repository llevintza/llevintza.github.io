import { TerminalLines } from "@/components/motion";

import { HeroBackground } from "./hero/hero-background";
import { HeroCtas } from "./hero/hero-ctas";
import { HeroPrompt } from "./hero/hero-prompt";
import { TerminalPanel } from "./hero/terminal-panel";
import { headline, intro, name, tagline } from "./hero/content";
import { heroCommand, heroLineDelay, taglineStart } from "./hero/timing";

/**
 * Home hero (#12): `$ whoami --long` prompt, name, tagline, intro, CTAs and
 * a terminal panel of current projects over a dithered mesh (#60).
 *
 * Server component, no client JS. The name and intro paint with the first
 * frame (they are the LCP candidates); only the prompt, tagline lines and
 * terminal rows animate, through the shared CSS motion primitives
 * (`TypedText`, `TerminalLines`), and only without a reduced-motion
 * preference.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate border-b border-line"
    >
      <HeroBackground />
      <div className="mx-auto grid max-w-wrap items-center gap-12 px-4 pt-10 pb-16 sm:px-gutter sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-14 lg:pt-20 lg:pb-24">
        <div>
          <HeroPrompt command={heroCommand} />
          <h1
            id="hero-title"
            className="mt-4 text-[clamp(2.5rem,5vw+1rem,4.5rem)] leading-none"
          >
            {name}
            <span className="text-accent" aria-hidden="true">
              .
            </span>
          </h1>
          {/* The README headline for assistive tech; the flags below are
              its visual, console-style rendering. */}
          <p className="sr-only">{headline}</p>
          <div aria-hidden="true">
            <TerminalLines
              as="ul"
              startDelay={taglineStart}
              lineDelay={heroLineDelay}
              className="mt-5 font-mono text-sm text-ink sm:text-base"
              lineClassName="pl-[3ch] -indent-[3ch]"
            >
              {tagline.map((line) => (
                <span key={line}>
                  <span className="text-accent">-- </span>
                  {line}
                </span>
              ))}
            </TerminalLines>
          </div>
          <p className="mt-6 text-ink">{intro}</p>
          <HeroCtas />
        </div>
        <TerminalPanel />
      </div>
    </section>
  );
}
