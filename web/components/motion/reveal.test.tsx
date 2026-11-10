import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Reveal } from "./reveal";
import {
  DEFAULT_REVEAL_AMOUNT,
  revealAmount,
  revealStyle,
} from "./reveal-attributes";
import { Stagger, StaggerItem } from "./stagger";
import { duration, ease, revealOffset, staggerStep } from "./tokens";

const css = readFileSync(
  path.join(import.meta.dirname, "motion.module.css"),
  "utf8",
);

describe("<Reveal>", () => {
  it("renders visible markup with an untouched reveal attribute", () => {
    const html = renderToStaticMarkup(
      <Reveal className="mt-6">
        <p>hello</p>
      </Reveal>,
    );
    expect(html).toMatch(
      /^<div class="[^"]*reveal[^"]* mt-6" style="--reveal-duration:320ms;[^"]*" data-reveal="">/,
    );
    expect(html).not.toMatch(/opacity|transform|hidden/);
  });

  it("passes once and amount to the observer as attributes", () => {
    const html = renderToStaticMarkup(
      <Reveal once={false} amount={0.3}>
        x
      </Reveal>,
    );
    expect(html).toContain('data-reveal-once="false"');
    expect(html).toContain('data-reveal-amount="0.3"');
  });
});

describe("<Stagger>", () => {
  it("numbers its items in order for the transition delay", () => {
    const html = renderToStaticMarkup(
      <Stagger as="ul" className="grid">
        {["a", "b", "c"].map((item) => (
          <StaggerItem as="li" key={item}>
            {item}
          </StaggerItem>
        ))}
      </Stagger>,
    );
    expect(html).toMatch(
      /^<ul class="[^"]*stagger[^"]* grid" style="--reveal-duration[^"]*" data-reveal="">/,
    );
    expect([...html.matchAll(/style="--i:(\d+)"/g)].map((m) => m[1])).toEqual([
      "0",
      "1",
      "2",
    ]);
  });
});

describe("revealAmount", () => {
  it("reads a valid fraction and falls back to the default otherwise", () => {
    expect(revealAmount("0.3")).toBe(0.3);
    expect(revealAmount(null)).toBe(DEFAULT_REVEAL_AMOUNT);
    expect(revealAmount("2")).toBe(DEFAULT_REVEAL_AMOUNT);
    expect(revealAmount("nope")).toBe(DEFAULT_REVEAL_AMOUNT);
  });
});

describe("motion.module.css", () => {
  it("takes the reveal timing from tokens.ts", () => {
    expect(revealStyle).toEqual({
      "--reveal-duration": `${duration.base * 1000}ms`,
      "--reveal-ease": `cubic-bezier(${ease.join(", ")})`,
      "--reveal-offset": `${revealOffset}px`,
      "--stagger-step": `${staggerStep * 1000}ms`,
    });
    // The CSS reads only those properties: no hard-coded reveal timing.
    for (const name of Object.keys(revealStyle)) {
      expect(css).toContain(`var(${name})`);
    }
    expect(css).not.toMatch(/\d+ms cubic-bezier|translateY\(\d+px\)/);
  });

  it("only hides blocks inside the no-motion-preference query", () => {
    const query = "@media (prefers-reduced-motion: no-preference)";
    const start = css.indexOf(query);
    const end = css.indexOf("/* ---- Print");
    expect(start).toBeGreaterThan(-1);
    const hidden = [...css.matchAll(/\[data-reveal="hidden"\]/g)];
    expect(hidden.length).toBeGreaterThan(0);
    for (const match of hidden) {
      expect(match.index).toBeGreaterThan(start);
      expect(match.index).toBeLessThan(end);
    }
  });
});
