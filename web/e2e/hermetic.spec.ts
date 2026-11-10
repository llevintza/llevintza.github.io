import { test, expect } from "./fixtures";

// Self-tests for the hermetic network fixture in e2e/fixtures.ts.

test("known externals are served from local fixtures", async ({ page }) => {
  await page.goto("/");
  const width = await page.evaluate(async () => {
    const img = new Image();
    img.src = "https://llevintza.github.io/email-icons/img/color/github.png";
    await img.decode();
    return img.naturalWidth;
  });
  expect(width).toBeGreaterThan(0);
});

test("an unexpected external request is blocked and recorded", async ({
  page,
  unexpectedRequests,
}) => {
  await page.goto("/");
  const outcome = await page.evaluate(() =>
    fetch("https://example.com/tracker.js").then(
      () => "loaded",
      () => "blocked",
    ),
  );
  expect(outcome).toBe("blocked");
  // The fixture fails any test that leaves entries here; clear the expected one.
  expect(unexpectedRequests).toEqual(["https://example.com/tracker.js"]);
  unexpectedRequests.length = 0;
});
