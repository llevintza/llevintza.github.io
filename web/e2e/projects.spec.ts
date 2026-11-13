import { featuredProjects } from "../content/featured";
import { expect, test } from "./fixtures";

// /projects/ shows the featured projects only; the "All public repos" list
// was removed in #113 (the full list is on the GitHub profile).
test.describe("/projects/", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects/", { waitUntil: "load" });
  });

  test("has no All public repos section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /all public repos/i }),
    ).toHaveCount(0);
    await expect(page.locator("#all-repos-heading")).toHaveCount(0);
  });

  test("still lists every featured project", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "Projects" }),
    ).toBeVisible();
    for (const project of featuredProjects) {
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: project.name,
          exact: true,
        }),
      ).toBeVisible();
    }
  });
});
