import { test, expect } from "./fixtures";
import { getRoutes, TOP_LEVEL } from "./routes";

const routes = getRoutes();

test.describe("every route", () => {
  for (const route of routes) {
    test(`${route} renders`, async ({ page, consoleErrors }) => {
      const response = await page.goto(route, { waitUntil: "load" });
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.status(), `HTTP status for ${route}`).toBe(200);

      // Exactly one visible main heading.
      await expect(page.locator("h1:visible")).toHaveCount(1);

      // Console theme basics (R62-02): next-themes set data-theme on <html>.
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        /^(dark|light)$/,
      );

      // Self-hosted fonts: at least one loaded, none failed. Any font request
      // to an external host already fails the test via the hermetic fixture.
      const fonts = await page.evaluate(async () => {
        await document.fonts.ready;
        const faces = [...document.fonts];
        return {
          loaded: faces.filter((f) => f.status === "loaded").length,
          failed: faces
            .filter((f) => f.status === "error")
            .map((f) => `${f.family} ${f.weight} ${f.style}`),
        };
      });
      expect(fonts.failed, `fonts that failed to load on ${route}`).toEqual([]);
      expect(fonts.loaded, `loaded fonts on ${route}`).toBeGreaterThan(0);

      // No broken images.
      const images = page.locator("img");
      for (const img of await images.all()) {
        await img.scrollIntoViewIfNeeded();
      }
      // Lazy images start loading only once scrolled to: poll until settled.
      await expect
        .poll(
          () =>
            images.evaluateAll((els) =>
              (els as HTMLImageElement[])
                .filter((img) => !img.complete || img.naturalWidth === 0)
                .map((img) => img.currentSrc || img.src),
            ),
          { message: `broken images on ${route}` },
        )
        .toEqual([]);

      expect(consoleErrors, `console errors on ${route}`).toEqual([]);
    });
  }
});

test.describe("theme", () => {
  // The toggle landed with the design tokens (#51); see #7 and #34.
  test("toggle flips [data-theme] and persists across reloads", async ({
    page,
  }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", /^(dark|light)$/);
    const before = await html.getAttribute("data-theme");
    const after = before === "dark" ? "light" : "dark";

    await page.getByRole("button", { name: /theme/i }).click();
    await expect(html).toHaveAttribute("data-theme", after);

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", after);
  });
});

test.describe("phone navigation", () => {
  // The header (#8) collapses the nav into a <details> "menu" below md.
  test("nav reaches every top-level page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "phone viewport only");
    const header = page.locator("header");
    for (const target of TOP_LEVEL) {
      const url = new RegExp(`${target.replace(/\//g, "\\/")}$`);
      await page.goto("/");
      if (target === "/") {
        // Home is the brand link, not a menu item.
        await header.locator('a[href="/"]').first().click();
      } else {
        await header.locator("summary", { hasText: "menu" }).click();
        const nav = page.getByRole("navigation", { name: "Main" });
        await nav.locator(`a[href="${target}"]`).click();
        // The menu closes after navigating; reopen it to check the active link.
        await expect(page).toHaveURL(url);
        await header.locator("summary", { hasText: "menu" }).click();
        await expect(nav.locator(`a[href="${target}"]`)).toHaveAttribute(
          "aria-current",
          "page",
        );
      }
      await expect(page).toHaveURL(url);
      await expect(page.locator("h1:visible")).toHaveCount(1);
    }
  });
});
