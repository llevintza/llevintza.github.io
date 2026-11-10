import { describe, expect, it } from "vitest";

import {
  startScrollReveal,
  type ScrollRevealEnv,
} from "./scroll-reveal-driver";

const VIEWPORT = 800;

/** A `[data-reveal]` block with a movable position. */
class FakeBlock {
  attrs = new Map<string, string>([["data-reveal", ""]]);
  constructor(
    public top: number,
    public height = 200,
    attrs: Record<string, string> = {},
  ) {
    for (const [k, v] of Object.entries(attrs)) this.attrs.set(k, v);
  }
  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  getBoundingClientRect() {
    return { top: this.top, bottom: this.top + this.height } as DOMRect;
  }
  get phase() {
    return this.getAttribute("data-reveal");
  }
}

/** Records observers so a test can deliver entries by hand. */
function setup(blocks: FakeBlock[], { reduce = false } = {}) {
  const observers: FakeObserver[] = [];
  class FakeObserver {
    observed = new Set<FakeBlock>();
    disconnected = false;
    constructor(
      public callback: IntersectionObserverCallback,
      public options: IntersectionObserverInit,
    ) {
      observers.push(this);
    }
    observe(el: FakeBlock) {
      this.observed.add(el);
    }
    unobserve(el: FakeBlock) {
      this.observed.delete(el);
    }
    disconnect() {
      this.disconnected = true;
      this.observed.clear();
    }
    /** Delivers one entry for `el` from its current position. */
    fire(el: FakeBlock, isIntersecting: boolean) {
      this.callback(
        [
          {
            target: el,
            isIntersecting,
            boundingClientRect: el.getBoundingClientRect(),
          } as unknown as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    }
  }

  const env = {
    document: { querySelectorAll: () => blocks },
    window: {
      innerHeight: VIEWPORT,
      matchMedia: (query: string) => ({
        matches: reduce && query.includes("reduce"),
      }),
      IntersectionObserver: FakeObserver,
    },
  } as unknown as ScrollRevealEnv;

  const cleanup = startScrollReveal(env);
  return { cleanup, observers };
}

describe("startScrollReveal", () => {
  it("hides only the blocks that start below the fold", () => {
    const onScreen = new FakeBlock(100);
    const below = new FakeBlock(VIEWPORT + 50);
    const { observers } = setup([onScreen, below]);

    expect(onScreen.phase).toBe("");
    expect(below.phase).toBe("hidden");
    expect(observers).toHaveLength(1);
    expect([...observers[0]!.observed]).toEqual([below]);
    expect(observers[0]!.options.threshold).toBe(0.15);
  });

  it("uses one observer per threshold", () => {
    const { observers } = setup([
      new FakeBlock(900),
      new FakeBlock(1200),
      new FakeBlock(1500, 200, { "data-reveal-amount": "0.3" }),
    ]);
    expect(
      observers.map((o) => [o.options.threshold, o.observed.size]),
    ).toEqual([
      [0.15, 2],
      [0.3, 1],
    ]);
  });

  it("reveals an intersecting block and stops watching it", () => {
    const block = new FakeBlock(1000);
    const { observers } = setup([block]);
    const observer = observers[0]!;

    block.top = 500;
    observer.fire(block, true);
    expect(block.phase).toBe("visible");
    expect(observer.observed.has(block)).toBe(false);
  });

  it("hides a once={false} block again when it leaves through the bottom", () => {
    const block = new FakeBlock(1000, 200, { "data-reveal-once": "false" });
    const { observers } = setup([block]);
    const observer = observers[0]!;

    block.top = 500;
    observer.fire(block, true);
    expect(block.phase).toBe("visible");
    expect(observer.observed.has(block)).toBe(true);

    block.top = 900; // scrolled back up: the block is below the viewport
    observer.fire(block, false);
    expect(block.phase).toBe("hidden");

    block.top = -400; // scrolled past it upwards: it stays visible
    observer.fire(block, true);
    observer.fire(block, false);
    expect(block.phase).toBe("visible");
  });

  it("shows blocks jumped over when the destination fires", () => {
    const skipped = new FakeBlock(1000);
    const skippedToo = new FakeBlock(1400, 200, {
      "data-reveal-once": "false",
    });
    const destination = new FakeBlock(3000);
    const { observers } = setup([skipped, skippedToo, destination]);
    const observer = observers[0]!;

    // window.scrollTo(0, 2800): no entry for the skipped blocks.
    skipped.top = -1800;
    skippedToo.top = -1400;
    destination.top = 200;
    observer.fire(destination, true);

    expect(destination.phase).toBe("visible");
    expect(skipped.phase).toBe("visible");
    expect(skippedToo.phase).toBe("visible");
    expect(observer.observed.has(skipped)).toBe(false);
    // A replaying block keeps being watched.
    expect(observer.observed.has(skippedToo)).toBe(true);
  });

  it("does nothing under prefers-reduced-motion: reduce", () => {
    const block = new FakeBlock(1000);
    const { cleanup, observers } = setup([block], { reduce: true });
    expect(cleanup).toBeUndefined();
    expect(observers).toHaveLength(0);
    expect(block.phase).toBe("");
  });

  it("does nothing without IntersectionObserver", () => {
    const block = new FakeBlock(1000);
    const env = {
      document: { querySelectorAll: () => [block] },
      window: { innerHeight: VIEWPORT, matchMedia: () => ({ matches: false }) },
    } as unknown as ScrollRevealEnv;
    expect(startScrollReveal(env)).toBeUndefined();
    expect(block.phase).toBe("");
  });

  it("disconnects and resets every block on cleanup", () => {
    const shown = new FakeBlock(1000);
    const waiting = new FakeBlock(2000);
    const { cleanup, observers } = setup([shown, waiting]);
    shown.top = 400;
    observers[0]!.fire(shown, true);

    cleanup?.();
    expect(observers.every((o) => o.disconnected)).toBe(true);
    expect(shown.phase).toBe("");
    expect(waiting.phase).toBe("");
  });
});
