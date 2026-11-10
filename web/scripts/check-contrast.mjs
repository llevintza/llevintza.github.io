#!/usr/bin/env node
// WCAG 2.x contrast check for the theme tokens in app/globals.css (the single
// source of truth). Fails (exit 1) if any text pair is below 4.5:1, or 3:1
// for pairs marked as large display text / non-text UI.
//
// Usage: pnpm check:contrast

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Optional argument: path to another stylesheet (used to test the checker).
const CSS_PATH =
  process.argv[2] ??
  fileURLToPath(new URL("../app/globals.css", import.meta.url));

const TEXT = ["ink", "muted", "link", "head", "accent"];
const SURFACES = ["bg", "panel"];

/** @type {{ fg: string, bg: string, min: number, note: string }[]} */
const PAIRS = [
  ...TEXT.flatMap((fg) =>
    SURFACES.map((bg) => ({ fg, bg, min: 4.5, note: "text" })),
  ),
  { fg: "btn-ink", bg: "btn-bg", min: 4.5, note: "button text" },
  // Large display text only (>= 24px, or >= 18.66px bold) may use 3:1.
  // None of the body/meta tokens rely on this; add pairs here if they do.
  // Non-text UI (WCAG 1.4.11): the focus ring must reach 3:1.
  ...SURFACES.map((bg) => ({ fg: "ring", bg, min: 3, note: "focus ring" })),
];

/** Extract `--name: value;` declarations from the block opened by `selector`. */
function block(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1)
    throw new Error(`Selector not found in globals.css: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const vars = {};
  for (const m of css
    .slice(open + 1, close)
    .matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h =
      hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length === 3 || parts[3] === 1) return parts.slice(0, 3);
    throw new Error(
      `Translucent colour can't be checked for contrast: ${value}`,
    );
  }
  throw new Error(`Unsupported colour: ${value}`);
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(CSS_PATH, "utf8");
const dark = block(css, ":root");
const lightExplicit = block(css, ':root[data-theme="light"]');
const lightSystem = block(css, ':root:not([data-theme="dark"])');

let failed = false;

// The JS-off (media query) and explicit light palettes must not drift.
const keys = new Set([
  ...Object.keys(lightExplicit),
  ...Object.keys(lightSystem),
]);
for (const k of keys) {
  if (lightExplicit[k] !== lightSystem[k]) {
    console.error(
      `✗ light palettes differ for --${k}: [data-theme="light"] ${lightExplicit[k]} vs prefers-color-scheme ${lightSystem[k]}`,
    );
    failed = true;
  }
}

const themes = { dark, light: { ...dark, ...lightExplicit } };

for (const [name, vars] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const { fg, bg, min, note } of PAIRS) {
    if (!vars[fg] || !vars[bg]) {
      console.error(`  ✗ missing token --${vars[fg] ? bg : fg}`);
      failed = true;
      continue;
    }
    const ratio = contrast(parseColor(vars[fg]), parseColor(vars[bg]));
    const ok = ratio >= min;
    if (!ok) failed = true;
    const line = `  ${ok ? "✓" : "✗"} ${`--${fg}`.padEnd(10)} on ${`--${bg}`.padEnd(9)} ${ratio.toFixed(2).padStart(5)}:1  (min ${min}:1, ${note})`;
    (ok ? console.log : console.error)(line);
  }
}

if (failed) {
  console.error("\nContrast check failed.");
  process.exit(1);
}
console.log("\nAll token pairs meet WCAG AA.");
