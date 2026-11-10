import path from "node:path";
import { test, expect } from "./fixtures";
import { getRoutes, routeSlug } from "./routes";

/**
 * Full-page UX screenshots for review on each PR (see e2e/README.md).
 * Written to web/ux-screenshots/<route-slug>-<project>-<theme>.png.
 */

const OUT_DIR = path.join(__dirname, "..", "ux-screenshots");
const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  // Tagged @ux: `pnpm ux:screenshots` runs only these, `pnpm test:e2e` skips them.
  test.describe(`${theme} theme`, { tag: "@ux" }, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    for (const route of getRoutes()) {
      test(`screenshot ${route}`, async ({ page }, testInfo) => {
        const response = await page.goto(route, { waitUntil: "load" });
        expect(response?.status(), `HTTP status for ${route}`).toBe(200);
        await page.evaluate(() => document.fonts.ready);

        const file = `${routeSlug(route)}-${testInfo.project.name}-${theme}.png`;
        await page.screenshot({
          path: path.join(OUT_DIR, file),
          fullPage: true,
          animations: "disabled",
          caret: "hide",
        });
      });
    }
  });
}
