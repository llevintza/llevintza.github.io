"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { duration, ease } from "./tokens";

/**
 * Sets the shared defaults for every Motion component below it.
 *
 * `reducedMotion="user"` makes Motion skip transform animations when the
 * visitor asks for reduced motion. Motion still tweens opacity in that mode,
 * so every primitive in this folder also checks `useReducedMotion()` and
 * renders static content instead. Rendered once, in `app/template.tsx`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: duration.base, ease }}
    >
      {children}
    </MotionConfig>
  );
}
