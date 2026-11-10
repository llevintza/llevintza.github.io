import type { ReactNode } from "react";

import styles from "./motion.module.css";
import { revealAttributes } from "./reveal-attributes";

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
 * A Server Component: the animation is a CSS transition, and the page's one
 * `<ScrollReveal />` only flips the block's `data-reveal` attribute. Visible
 * at rest: the server HTML and no-JS view show it fully. Off under
 * `prefers-reduced-motion`. Its box never changes size, so no layout shift.
 */
export function Reveal({ children, className, once, amount }: RevealProps) {
  return (
    <div
      className={cx(styles.reveal, className)}
      {...revealAttributes({ once, amount })}
    >
      {children}
    </div>
  );
}

export function cx(...names: (string | undefined)[]) {
  return names.filter(Boolean).join(" ");
}
