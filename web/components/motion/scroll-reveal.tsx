"use client";

import { useEffect } from "react";

import {
  REVEAL_AMOUNT_ATTR,
  REVEAL_ATTR,
  REVEAL_ONCE_ATTR,
  revealAmount,
  type RevealPhase,
} from "./reveal-attributes";

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
 * this does nothing for a visitor who asks for reduced motion.
 *
 * One component with one observer per threshold, rather than a Motion
 * component per block, keeps the page's hydration cost flat (#10).
 */
export function ScrollReveal() {
  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const blocks = [
      ...document.querySelectorAll<HTMLElement>(`[${REVEAL_ATTR}]`),
    ].filter((el) => el.getBoundingClientRect().top >= window.innerHeight);
    if (blocks.length === 0) return;

    const setPhase = (el: Element, phase: RevealPhase | "") =>
      el.setAttribute(REVEAL_ATTR, phase);

    const observers = new Map<number, IntersectionObserver>();
    const observerFor = (amount: number) => {
      let observer = observers.get(amount);
      if (!observer) {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const el = entry.target;
              const once = el.getAttribute(REVEAL_ONCE_ATTR) !== "false";
              // A jump past the block (an anchor link, a fast scroll) never
              // intersects it: show it rather than leave it hidden above.
              if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
                setPhase(el, "visible");
                if (once) observer?.unobserve(el);
              } else if (!once && entry.boundingClientRect.top > 0) {
                setPhase(el, "hidden");
              }
            }
          },
          { threshold: amount },
        );
        observers.set(amount, observer);
      }
      return observer;
    };

    for (const el of blocks) {
      setPhase(el, "hidden");
      observerFor(revealAmount(el.getAttribute(REVEAL_AMOUNT_ATTR))).observe(
        el,
      );
    }

    return () => {
      for (const observer of observers.values()) observer.disconnect();
      // Never leave a block hidden once the page goes away.
      for (const el of blocks) setPhase(el, "");
    };
  }, []);

  return null;
}
