import type { CSSProperties } from "react";

import { HeroBackground } from "./hero/hero-background";
import { HeroCtas } from "./hero/hero-ctas";
import { HeroPrompt } from "./hero/hero-prompt";
import { TerminalPanel } from "./hero/terminal-panel";
import { intro, name, tagline } from "./hero/content";
import styles from "./hero/hero.module.css";

/**
 * Home hero (#12): `$ whoami --long` prompt, name, tagline, intro, CTAs and
 * a terminal panel of current projects over a dithered mesh (#60).
 *
 * Server component, no client JS. The name and intro paint with the first
 * frame (they are the LCP candidates); only the prompt, tagline lines and
 * terminal rows animate, and only without a reduced-motion preference.
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
          <HeroPrompt command="whoami --long" />
          <h1
            id="hero-title"
            className="mt-4 text-[clamp(2.5rem,5vw+1rem,4.5rem)] leading-none"
          >
            {name}
            <span className="text-accent" aria-hidden="true">
              .
            </span>
          </h1>
          <ul className="mt-5 font-mono text-sm text-ink sm:text-base">
            {tagline.map((line, i) => (
              <li
                key={line}
                className={`${styles.print} pl-[3ch] -indent-[3ch]`}
                style={
                  {
                    "--i": i,
                    "--delay": "1.1s",
                  } as CSSProperties
                }
              >
                <span className="text-accent" aria-hidden="true">
                  --{" "}
                </span>
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-ink">{intro}</p>
          <HeroCtas />
        </div>
        <TerminalPanel />
      </div>
    </section>
  );
}
