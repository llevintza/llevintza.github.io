"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

import { duration, ease, revealOffset } from "./tokens";
import { useRevealOnScroll } from "./use-reveal-on-scroll";

const variants: Variants = {
  hidden: { opacity: 0, y: revealOffset, transition: { duration: 0 } },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease } },
};

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Replay each time the block re-enters from below. Default: once. */
  once?: boolean;
  /** Fraction of the block that must be visible to trigger. Default 0.15. */
  amount?: number;
};

/**
 * Fades a block in and lifts it `revealOffset` px when it scrolls into view.
 * Visible at rest: the server HTML and no-JS view show it fully. Off under
 * `prefers-reduced-motion`. Its box never changes size, so no layout shift.
 */
export function Reveal({ children, className, once, amount }: RevealProps) {
  const { ref, phase, reduce } = useRevealOnScroll<HTMLDivElement>({
    once,
    amount,
  });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={phase}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
