import { test, expect } from "./fixtures";

/**
 * The allocator-memo-builder case study (#111): a private project's page,
 * with a self-hosted walkthrough video that loads and plays only when the
 * visitor asks. The video is served locally, so this stays hermetic.
 */
const PAGE = "/projects/allocator-memo-builder/";
const VIDEO = "/projects/allocator-memo-builder/walkthrough.mp4";

test.describe("allocator-memo-builder case study", () => {
  test("renders as a private case study with no repo link", async ({
    page,
  }) => {
    const response = await page.goto(PAGE, { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Allocator Memo Builder" }),
    ).toBeVisible();
    for (const name of [
      "Problem",
      "Approach",
      "Outcome",
      "Video walkthrough",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(page.locator("main")).toContainText("Source on request");
    // Named, never linked: no repo URL anywhere in the markup.
    expect(await page.content()).not.toMatch(
      /github\.com(?:\/|%2F|\\\/)llevintza(?:\/|%2F|\\\/)allocator-memo-builder/i,
    );
  });

  test("the /projects/ card links to the case study", async ({ page }) => {
    await page.goto("/projects/", { waitUntil: "load" });
    const link = page.getByRole("link", {
      name: "allocator-memo-builder",
      exact: true,
    });
    await expect(link).toHaveAttribute("href", PAGE);
  });

  test("the video has a poster, preload none, and plays only on user action", async ({
    page,
  }) => {
    const videoRequests: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).pathname === VIDEO) videoRequests.push(req.url());
    });

    await page.goto(PAGE, { waitUntil: "load" });
    const video = page
      .getByRole("region", { name: "Video walkthrough" })
      .locator("video");
    await video.scrollIntoViewIfNeeded();

    await expect(video).toHaveAttribute("aria-label", "Video walkthrough");
    await expect(video).toHaveAttribute(
      "poster",
      "/projects/allocator-memo-builder/walkthrough-poster.webp",
    );
    await expect(video).toHaveAttribute("preload", "none");
    await expect(video).toHaveAttribute("controls", "");
    await expect(video).toHaveAttribute("width", "1280");
    await expect(video).toHaveAttribute("height", "720");
    await expect(video).not.toHaveAttribute("autoplay");
    await expect(video).not.toHaveAttribute("loop");
    await expect(video.locator("track")).toHaveAttribute("kind", "captions");

    // The poster has loaded and the space is reserved: no layout shift.
    const poster = await page.request.get(
      "/projects/allocator-memo-builder/walkthrough-poster.webp",
    );
    expect(poster.status()).toBe(200);
    const box = await video.boundingBox();
    expect(box && box.height / box.width).toBeCloseTo(720 / 1280, 1);

    // Nothing plays or downloads without a click.
    await page.waitForTimeout(1_000);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    expect(
      await video.evaluate((v: HTMLVideoElement) => v.networkState),
    ).not.toBe(2); // NETWORK_LOADING
    expect(videoRequests).toEqual([]);

    // A visitor starts it from the keyboard (native controls): it fetches
    // the file and plays.
    const fetched = page.waitForRequest(
      (req) => new URL(req.url()).pathname === VIDEO,
    );
    await video.focus();
    await page.keyboard.press("Space");
    await fetched;
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
      .toBe(false);
  });

  test("the video file is served as MP4", async ({ request }) => {
    const res = await request.head(VIDEO);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("video/mp4");
  });
});
