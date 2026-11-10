import {
  REVEAL_AMOUNT_ATTR,
  REVEAL_ATTR,
  REVEAL_ONCE_ATTR,
  revealAmount,
  type RevealPhase,
} from "./reveal-attributes";

/** What the driver needs from the page, so tests can pass fakes. */
export type ScrollRevealEnv = {
  document: Pick<Document, "querySelectorAll">;
  window: Pick<Window, "innerHeight" | "matchMedia"> & {
    IntersectionObserver?: typeof IntersectionObserver;
  };
};

/**
 * Hides the `[data-reveal]` blocks that start below the fold and reveals
 * them as they scroll in. Returns a cleanup that disconnects and resets
 * every block to `""` (visible), or `undefined` when there is nothing to
 * do: no `IntersectionObserver`, reduced motion, or no block below the fold.
 */
export function startScrollReveal({
  document,
  window,
}: ScrollRevealEnv): (() => void) | undefined {
  const Observer = window.IntersectionObserver;
  if (
    !Observer ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return undefined;
  }

  const blocks = [...document.querySelectorAll(`[${REVEAL_ATTR}]`)].filter(
    (el) => el.getBoundingClientRect().top >= window.innerHeight,
  );
  if (blocks.length === 0) return undefined;

  const setPhase = (el: Element, phase: RevealPhase | "") =>
    el.setAttribute(REVEAL_ATTR, phase);
  const isOnce = (el: Element) => el.getAttribute(REVEAL_ONCE_ATTR) !== "false";
  const observers = new Map<number, IntersectionObserver>();

  const reveal = (el: Element) => {
    setPhase(el, "visible");
    if (isOnce(el)) {
      for (const observer of observers.values()) observer.unobserve(el);
    }
  };

  const onEntries = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        reveal(entry.target);
      } else if (!isOnce(entry.target) && entry.boundingClientRect.top > 0) {
        setPhase(entry.target, "hidden");
      }
    }
    // A jump past a block (an anchor link, End, a fast scroll) delivers no
    // entry for it: it goes from "not intersecting" below to "not
    // intersecting" above. The blocks at the destination do fire, so sweep
    // here and show any block still hidden above the viewport.
    for (const el of blocks) {
      if (
        el.getAttribute(REVEAL_ATTR) === "hidden" &&
        el.getBoundingClientRect().bottom <= 0
      ) {
        reveal(el);
      }
    }
  };

  for (const el of blocks) {
    setPhase(el, "hidden");
    const amount = revealAmount(el.getAttribute(REVEAL_AMOUNT_ATTR));
    let observer = observers.get(amount);
    if (!observer) {
      observer = new Observer(onEntries, { threshold: amount });
      observers.set(amount, observer);
    }
    observer.observe(el);
  }

  return () => {
    for (const observer of observers.values()) observer.disconnect();
    // Never leave a block hidden once the page goes away.
    for (const el of blocks) setPhase(el, "");
  };
}
