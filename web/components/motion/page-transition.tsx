"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";

import { duration, ease } from "./tokens";

// True once the first page has hydrated. The first page load never animates:
// its HTML paints immediately (no opacity 0 before hydration, no LCP delay).
// Only client-side navigations after that play the transition.
let hasHydrated = false;

/**
 * Short fade-and-lift on route changes, used by `app/template.tsx` (Next
 * remounts a template on every navigation). Off under reduced motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const animateIn = hasHydrated && !reduce;

  useEffect(() => {
    hasHydrated = true;
  }, []);

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.fast, ease }}
    >
      {children}
    </motion.div>
  );
}
