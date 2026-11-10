/**
 * Shared keyboard focus ring: the 2px `--ring` outline from #60, never
 * removed. Components with their own class lists add it explicitly so the
 * ring survives any utility that resets outlines.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
