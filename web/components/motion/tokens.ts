/**
 * Motion tokens for the "Engineer's Console" direction (design spec #60, §6).
 * Console motion is short and crisp: small distances, quick fades, no bounce.
 * Animate only `opacity` and `transform` so nothing shifts layout.
 */

/** Durations in seconds (Motion's unit). */
export const duration = {
  /** Hover and press feedback. */
  instant: 0.08,
  /** Page transition. */
  fast: 0.2,
  /** Scroll reveal of one block. */
  base: 0.32,
} as const;

/** Ease-out curve: starts fast, settles gently. */
export const ease = [0.22, 1, 0.36, 1] as const;

/** Distance in px a revealed block travels upward while fading in. */
export const revealOffset = 12;

/** Delay in seconds between children of a stagger group ("print" rhythm). */
export const staggerStep = 0.06;
