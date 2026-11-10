"use client";

import { useReducedMotion, type MotionProps } from "motion/react";

import { duration } from "./tokens";

type HoverMotionProps = Pick<
  MotionProps,
  "whileHover" | "whileTap" | "transition"
>;

const presets = {
  /** Buttons: shift 2px into their hard shadow while pressed (spec #60 §5). */
  press: {
    whileTap: { x: 2, y: 2 },
    transition: { duration: duration.instant },
  },
  /** Prompt links (`> contact`, `./blog`): nudge 2px right on hover. */
  nudge: {
    whileHover: { x: 2 },
    transition: { duration: duration.instant },
  },
} satisfies Record<string, HoverMotionProps>;

export type HoverPreset = keyof typeof presets;

/**
 * Props for a `motion.*` element's hover and press feedback. Spread them:
 * `<motion.button {...useHoverMotion("press")}>`. Returns `{}` under
 * `prefers-reduced-motion`, so only the CSS colour change remains.
 *
 * Colour swaps (inverse-video title bars, link hovers) are NOT Motion: do
 * them in CSS with no transition, so they are instant (spec #60 §6).
 */
export function useHoverMotion(
  preset: HoverPreset = "press",
): HoverMotionProps {
  const reduce = useReducedMotion();
  return reduce ? {} : presets[preset];
}
