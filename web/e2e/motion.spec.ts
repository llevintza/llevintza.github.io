import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import { getRoutes } from "./routes";

// Motion guarantees from #9 (web/components/motion/README.md):
// 1. With `prefers-reduced-motion: reduce`, nothing animates and every
//    animated element is in its finished state.
// 2. With JavaScript off, all content is visible: nothing is left at
//    opacity 0 or half-typed (the CSS animations finish on their own).
// 3. For a visitor with no motion preference, everything ends up visible.
// 4. Print shows the finished state, even for blocks not yet revealed.

const allRoutes = getRoutes();

/** The newest post, so the motion checks cover the MDX layout too. */
const newestPost = allRoutes
  .filter((r) => /^\/blog\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/.test(r))
  .sort()
  .at(-1);

// Fail loudly rather than silently dropping the post layout from coverage if
// the permalink shape or the route source ever changes.
if (
  !newestPost &&
  allRoutes.some((r) => r.startsWith("/blog/") && r !== "/blog/")
) {
  throw new Error("motion.spec: no blog post permalink matched the pattern");
}

const ROUTES = [
  "/",
  "/blog/",
  "/projects/",
  "/about/",
  ...(newestPost ? [newestPost] : []),
];

type Problem = { text: string; reason: string };

/**
 * Text that a visitor can't fully see because of motion styles. Covers every
 * element with its own non-blank text that is rendered (has a box, so text in
 * a closed `<details>` menu or under `display: none` doesn't count):
 * - `visibility` other than `visible` (a "print" reveal stuck hidden), except
 *   inside the not-yet-mounted theme toggle,
 * - an effective opacity below 1 (its own times every ancestor's), or
 * - a single-line, overflow-clipped box narrower than its text (half-typed
 *   text), unless it truncates on purpose with `text-overflow: ellipsis`.
 * Visually-hidden text (`sr-only`, 1px boxes) is skipped.
 */
async function hiddenText(page: Page): Promise<Problem[]> {
  return page.evaluate(() => {
    const problems: { text: string; reason: string }[] = [];
    const ownText = (el: Element) =>
      [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();

    for (const el of document.body.querySelectorAll("*")) {
      const text = ownText(el);
      if (!text) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (el.getClientRects().length === 0) continue; // not rendered
      if (rect.width <= 1 && rect.height <= 1) continue; // sr-only

      // The theme toggle only works with JS, so it is deliberately disabled
      // and `invisible` until it mounts. Exempt exactly that control (a
      // disabled button labelled "theme"), not buttons in general.
      const jsOnlyToggle = el.closest("button:disabled");
      const isThemeToggle =
        jsOnlyToggle !== null &&
        /\btheme\b/i.test(jsOnlyToggle.textContent ?? "");
      if (style.visibility !== "visible" && !isThemeToggle) {
        problems.push({ text, reason: `visibility ${style.visibility}` });
        continue;
      }

      let opacity = 1;
      for (let n: Element | null = el; n; n = n.parentElement) {
        opacity *= Number(getComputedStyle(n).opacity);
      }
      if (opacity < 0.99) {
        problems.push({ text, reason: `opacity ${opacity.toFixed(2)}` });
        continue;
      }

      const clipsX = ["hidden", "clip"].includes(style.overflowX);
      if (
        clipsX &&
        style.whiteSpace.startsWith("nowrap") &&
        style.textOverflow !== "ellipsis" &&
        el.scrollWidth > el.clientWidth + 1
      ) {
        problems.push({
          text,
          reason: `clipped ${el.clientWidth}px of ${el.scrollWidth}px`,
        });
      }
    }
    return problems;
  });
}

/** Animations still running (infinite ones included). */
async function runningAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running")
      .map((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        const name =
          a instanceof CSSAnimation
            ? `animation ${a.animationName}`
            : a instanceof CSSTransition
              ? `transition ${a.transitionProperty}`
              : "script animation";
        return `${name} on <${target?.tagName.toLowerCase() ?? "?"} class="${target?.getAttribute("class") ?? ""}">`;
      }),
  );
}

/**
 * Waits until every finite animation has finished. Infinite ones (the cursor
 * blink, a background drift) never finish, so they are ignored here.
 */
async function settle(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter(
                (a) =>
                  a.playState === "running" &&
                  a.effect?.getComputedTiming().iterations !== Infinity,
              ).length,
        ),
      { message: "finite animations still running", timeout: 10_000 },
    )
    .toBe(0);
}

/**
 * Scrolls to the bottom in viewport steps so scroll reveals can trigger.
 * Driven from the test, not an in-page loop: with JavaScript off, page
 * timers never fire. The 120 ms per step only gives IntersectionObserver a
 * frame to fire; the assertions don't depend on it, because every caller
 * then waits for animations to settle via `settle()` (no motion preference)
 * or expects none at all (reduced motion).
 */
async function scrollThrough(page: Page) {
  const { height, step } = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    step: Math.max(200, Math.floor(window.innerHeight * 0.8)),
  }));
  for (let y = step; y < height + step; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
}

/**
 * The site nav that is visible at this viewport. The desktop bar is hidden
 * on phones, where the nav sits in a `<details>` "menu": open it first.
 */
async function openNav(page: Page) {
  const menu = page.locator("summary:visible", { hasText: "menu" });
  if (await menu.count()) await menu.first().click();
  return page.locator("nav:visible").first();
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const route of ROUTES) {
    test(`${route} has no running animations and nothing hidden`, async ({
      page,
    }) => {
      await page.goto(route, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);

      expect(await runningAnimations(page), "running animations").toEqual([]);
      expect(await hiddenText(page), "hidden or half-typed text").toEqual([]);

      // Below-the-fold blocks are never hidden or revealed either.
      await scrollThrough(page);
      expect(await runningAnimations(page), "animations after scroll").toEqual(
        [],
      );
      expect(await hiddenText(page), "hidden text after scroll").toEqual([]);
    });
  }

  test("a client-side navigation has no page transition", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const nav = await openNav(page);
    const link = nav.locator('a[href]:not([href="/"])').first();
    const target = await link.getAttribute("href");
    await link.click();
    await page.waitForURL((url) => url.pathname === target);
    expect(await runningAnimations(page), "transition animations").toEqual([]);
    expect(await hiddenText(page), "hidden text after navigation").toEqual([]);
  });
});

test.describe("JavaScript off", () => {
  // No motion preference, so the CSS animations do run: they must finish
  // visible without any script.
  test.use({ javaScriptEnabled: false, reducedMotion: "no-preference" });

  for (const route of ROUTES) {
    test(`${route} shows all content without JS`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });

      await expect(page.locator("h1:visible")).toHaveCount(1);
      await expect(page.locator("main")).toBeVisible();

      await settle(page);
      expect(await hiddenText(page), "hidden or half-typed text").toEqual([]);

      await scrollThrough(page);
      await settle(page);
      expect(await hiddenText(page), "hidden text after scroll").toEqual([]);
    });
  }

  test("the nav is visible without JS", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    // On phones this opens the native <details> menu, which needs no JS.
    const nav = await openNav(page);
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link").first()).toBeVisible();
    // The home hero types and prints on load; let it finish first.
    await settle(page);
    expect(await hiddenText(page), "hidden text with the nav open").toEqual([]);
  });
});

test.describe("no motion preference", () => {
  test.use({ reducedMotion: "no-preference" });

  for (const route of ROUTES) {
    test(`${route} ends with everything visible`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      await settle(page);
      expect(await hiddenText(page), "hidden text after load").toEqual([]);

      await scrollThrough(page);
      await settle(page);
      expect(await hiddenText(page), "hidden text after scroll").toEqual([]);
    });
  }
});

test.describe("print", () => {
  test.use({ reducedMotion: "no-preference" });

  for (const route of ROUTES) {
    test(`${route} prints the finished state`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      // Print straight away: scroll reveals below the fold are still hidden
      // on screen, and the print styles must show them anyway.
      await page.emulateMedia({ media: "print" });
      await settle(page);
      expect(await hiddenText(page), "hidden text in print").toEqual([]);
    });
  }
});
