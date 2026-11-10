/**
 * The data attributes shared by `<Reveal>`, `<Stagger>` and
 * `<ScrollReveal>`. The server renders `data-reveal=""` (untouched, fully
 * visible); after hydration `<ScrollReveal>` sets it to `hidden` for blocks
 * that start below the fold, then to `visible` when they scroll in.
 */
export const REVEAL_ATTR = "data-reveal";
export const REVEAL_ONCE_ATTR = "data-reveal-once";
export const REVEAL_AMOUNT_ATTR = "data-reveal-amount";

/** Default fraction of a block that must be visible to reveal it. */
export const DEFAULT_REVEAL_AMOUNT = 0.15;

export type RevealPhase = "hidden" | "visible";

export function revealAttributes({
  once,
  amount,
}: {
  once?: boolean;
  amount?: number;
}) {
  return {
    [REVEAL_ATTR]: "",
    ...(once === false ? { [REVEAL_ONCE_ATTR]: "false" } : {}),
    ...(amount === undefined ? {} : { [REVEAL_AMOUNT_ATTR]: String(amount) }),
  };
}

/** The observer threshold for a block, from its `data-reveal-amount`. */
export function revealAmount(value: string | null): number {
  const amount = value === null ? NaN : Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1
    ? amount
    : DEFAULT_REVEAL_AMOUNT;
}
