"use client";

import { useEffect } from "react";

import { startScrollReveal } from "./scroll-reveal-driver";

/**
 * Drives every `<Reveal>` and `<Stagger>` on the page; render it once per
 * page that uses them. Without it (or without JavaScript) the blocks simply
 * stay visible.
 *
 * Content is rendered visible on the server. After hydration, only blocks
 * that start *below the viewport* are hidden (they are off-screen, so
 * nobody sees the swap) and revealed when they scroll in. Blocks already on
 * screen are left alone, so the first paint and LCP are never delayed by an
 * animation. The hidden state only applies inside
 * `prefers-reduced-motion: no-preference` (see `motion.module.css`), and
 * this does nothing for a visitor who asks for reduced motion. The logic is
 * in `startScrollReveal` (`scroll-reveal-driver.ts`).
 *
 * One component with one observer per threshold, rather than a Motion
 * component per block, keeps the page's hydration cost flat (#10).
 */
export function ScrollReveal() {
  useEffect(() => startScrollReveal({ document, window }), []);
  return null;
}
