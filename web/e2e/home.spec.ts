import { test, expect } from "./fixtures";

/** Home page parity (#11) and the Now / Selected work highlights (#13). */
test.describe("home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
  });

  test("renders every home section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: /Leo Levintza/ }),
    ).toBeVisible();
    for (const name of [
      "Now",
      "Selected work",
      "Featured projects",
      "Latest posts",
      "Get in touch",
    ]) {
      const heading = page.getByRole("heading", { level: 2, name });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
    }
  });

  test("shows the README headline and intro", async ({ page }) => {
    await expect(page.locator("main")).toContainText(
      "Principal Software Engineer · Distributed Systems · Cloud-Native Backends",
    );
    await expect(page.locator("main")).toContainText(
      "I design and build distributed, cloud-native backend systems",
    );
  });

  test("Selected work shows the README figures as tiles", async ({ page }) => {
    const section = page.getByRole("region", { name: "Selected work" });
    const tiles = section.locator("ul").first().locator(":scope > li");
    await expect(tiles).toHaveCount(8);
    await expect(tiles.first()).toContainText("6 weeks");
    await expect(section).toContainText(
      "sustaining 5,000 events/sec per instance on Docker and Nomad",
    );
  });

  test("featured cards never link private repos", async ({ page }) => {
    const section = page.getByRole("region", { name: "Featured projects" });
    await expect(section.locator("article")).not.toHaveCount(0);
    for (const name of [
      "instrument-price-dashboard",
      "allocator-memo-builder",
      "hedge-fund-market-data",
    ]) {
      await expect(
        section.locator(`a[href*="github.com/llevintza/${name}"]`),
      ).toHaveCount(0);
    }
    await expect(
      section.getByRole("link", { name: "All projects", exact: true }),
    ).toHaveAttribute("href", "/projects/");
  });

  test("latest posts link to posts and the blog", async ({ page }) => {
    const section = page.getByRole("region", { name: "Latest posts" });
    const posts = section.locator("article");
    const count = await posts.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);
    await expect(posts.first().getByRole("link")).toHaveAttribute(
      "href",
      /^\/blog\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/,
    );
    await expect(
      section.getByRole("link", { name: "All posts" }),
    ).toHaveAttribute("href", "/blog/");
  });

  test("has no phone, Signal or personal email links", async ({ page }) => {
    await expect(
      page.locator(
        'a[href^="tel:"], a[href^="sms:"], a[href*="signal.me"], a[href^="mailto:"]',
      ),
    ).toHaveCount(0);
  });
});
