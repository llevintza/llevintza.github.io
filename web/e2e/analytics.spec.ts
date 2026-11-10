import { test, expect } from "./fixtures";
import { TOP_LEVEL } from "./routes";

// Umami analytics (ADR 0002, #58). The e2e build has no
// NEXT_PUBLIC_UMAMI_WEBSITE_ID, so the script must not render or load, and the
// site must store nothing on first load (the theme toggle stores a preference
// in localStorage only after a visitor picks one).

for (const route of TOP_LEVEL) {
  test(`${route} loads no analytics and stores nothing`, async ({
    page,
    context,
  }) => {
    const umamiRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname.endsWith("umami.is")) {
        umamiRequests.push(request.url());
      }
    });

    await page.goto(route, { waitUntil: "networkidle" });

    await expect(page.locator('script[src*="umami.is"]')).toHaveCount(0);
    expect(umamiRequests, "requests to Umami").toEqual([]);

    expect(await context.cookies(), "cookies set by the site").toEqual([]);
    const storage = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    expect(storage, "Web Storage keys set by the site").toEqual({
      local: [],
      session: [],
    });
  });
}
