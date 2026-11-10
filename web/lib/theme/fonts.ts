import localFont from "next/font/local";

/*
 * Self-hosted fonts (no font CDN at runtime). Files, licences and the subset
 * recipe live in app/fonts/README.md.
 *
 * Each call exposes a CSS variable on <html>; globals.css builds the
 * --font-mono / --font-pixel / --font-prose stacks from them.
 */

/** JetBrains Mono, upright, variable 300–700. The only preloaded font. */
export const jetbrainsMono = localFont({
  src: "../../app/fonts/jetbrains-mono/JetBrainsMono-Roman-subset.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  preload: true,
  variable: "--font-jetbrains-mono",
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Consolas",
    "monospace",
  ],
  adjustFontFallback: "Arial",
});

/**
 * JetBrains Mono italic, variable 300–700. A separate family so it is not
 * preloaded; globals.css puts it first in the stack for em/i/cite/dfn/var.
 */
export const jetbrainsMonoItalic = localFont({
  src: "../../app/fonts/jetbrains-mono/JetBrainsMono-Italic-subset.woff2",
  weight: "300 700",
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-jetbrains-mono-italic",
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Consolas",
    "monospace",
  ],
  adjustFontFallback: false,
});

/** Departure Mono: pixel-grid face for window chrome only (11 / 22 px). */
export const departureMono = localFont({
  src: "../../app/fonts/departure-mono/DepartureMono-Regular-subset.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-departure-mono",
  adjustFontFallback: false,
});

/**
 * Geist Sans (from the `geist` package) stays installed as the prose fallback
 * (--font-prose-sans). Loaded here rather than via `geist/font/sans` so it is
 * not preloaded while prose defaults to mono.
 */
export const geistSans = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-geist-sans",
  adjustFontFallback: "Arial",
});

/** Class names that set every font variable; apply to <html>. */
export const fontVariables = [
  jetbrainsMono.variable,
  jetbrainsMonoItalic.variable,
  departureMono.variable,
  geistSans.variable,
].join(" ");
