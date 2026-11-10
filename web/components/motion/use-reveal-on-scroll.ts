"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** `undefined` = untouched (server HTML, fully visible). */
export type RevealPhase = "hidden" | "visible" | undefined;

/**
 * Shared logic for `<Reveal>` and `<Stagger>`.
 *
 * Content is rendered visible on the server and stays visible if JS never
 * runs. After hydration, only blocks that start *below the viewport* are
 * hidden (they are off-screen, so nobody sees the swap) and revealed when
 * they scroll in. Blocks already on screen are left alone, so the first
 * paint and LCP are never delayed by an animation.
 */
export function useRevealOnScroll<T extends Element>({
  once = true,
  amount = 0.15,
}: { once?: boolean; amount?: number } = {}) {
  const ref = useRef<T>(null);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<RevealPhase>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (reduce || !el || typeof IntersectionObserver === "undefined") return;

    const startsBelowFold =
      el.getBoundingClientRect().top >= window.innerHeight;
    if (!startsBelowFold) return;

    setPhase("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setPhase("visible");
          if (once) observer.disconnect();
        } else if (!once && entry.boundingClientRect.top > 0) {
          setPhase("hidden");
        }
      },
      { threshold: amount },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      // Never leave a block hidden after a preference change.
      setPhase(undefined);
    };
  }, [amount, once, reduce]);

  return { ref, phase, reduce };
}
