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

      // No broken images: lazy images below the fold load once scrolled to.
      const images = page.locator("img");
      for (const img of await images.all()) {
        await img.scrollIntoViewIfNeeded();
      }
      const broken = await images.evaluateAll((els) =>
        (els as HTMLImageElement[])
          .filter((img) => !img.complete || img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src),
      );
      expect(broken, `broken images on ${route}`).toEqual([]);

      expect(consoleErrors, `console errors on ${route}`).toEqual([]);
    });
  }
});

test.describe("theme", () => {
  // TODO(#7): enable once the theme toggle lands.
  // https://github.com/llevintza/llevintza.github.io/issues/7
  test.fixme("toggle flips [data-theme] and persists across reloads", async ({
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
  // TODO(#8): enable once the site header and mobile nav land.
  // https://github.com/llevintza/llevintza.github.io/issues/8
  test.fixme("nav reaches every top-level page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "phone viewport only");
    for (const target of TOP_LEVEL) {
      await page.goto("/");
      const nav = page.getByRole("navigation").first();
      // A collapsed mobile menu sits behind a toggle button.
      const menu = page.getByRole("button", { name: /menu|navigation/i });
      if (await menu.isVisible()) await menu.click();
      await nav.locator(`a[href="${target}"]`).first().click();
      await expect(page).toHaveURL(
        new RegExp(`${target.replace(/\//g, "\\/")}$`),
      );
      await expect(page.locator("h1:visible")).toHaveCount(1);
    }
  });
});
