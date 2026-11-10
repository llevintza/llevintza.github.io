"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { duration, ease } from "./tokens";

/**
 * Sets the shared defaults for every Motion component below it.
 *
 * `reducedMotion="user"` makes Motion skip transform animations when the
 * visitor asks for reduced motion. Motion still tweens opacity in that mode,
 * so every primitive in this folder also checks `useReducedMotion()` and
 * renders static content instead. Rendered once, in `app/template.tsx`.
 *
 * `LazyMotion` with `domAnimation` ships only the animation features we use
 * (no layout or drag code). `strict` makes a full `motion.*` component throw
 * below this provider, so use the light `m.*` components instead. The
 * features are loaded synchronously on purpose: with an async `import()`,
 * Turbopack still lists the chunk in the first-load HTML, which measured
 * larger in total.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: duration.base, ease }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
