import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import { getRoutes } from "./routes";

/**
 * Site search (#19) against the built export, so out/pagefind/ exists. The
 * target is the first post in the export, and its title is read from its
 * HTML, so the test survives new or renamed posts.
 */

const OUT = path.join(__dirname, "..", "out");
const UX_DIR = path.join(__dirname, "..", "ux-screenshots");

function firstPost(): { route: string; title: string } {
  const route = getRoutes().find((r) =>
    /^\/blog\/\d{4}\/\d{2}\/\d{2}\//.test(r),
  );
  if (!route) throw new Error("No post in out/: run `pnpm build` first.");
  const html = readFileSync(path.join(OUT, route, "index.html"), "utf8");
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "";
  const title = h1.replace(/<[^>]+>/g, "").trim();
  return { route, title };
}

const post = firstPost();

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "load" });
  // The trigger is disabled until hydration, when the shortcuts attach.
  await expect(page.getByRole("button", { name: "search" })).toBeEnabled();
}

const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Search the site" });

test.describe("site search", () => {
  test("Cmd/Ctrl+K opens the palette, finds a post, Enter opens it", async ({
    page,
    consoleErrors,
  }) => {
    await openHome(page);
    await page.keyboard.press("ControlOrMeta+K");
    await expect(dialog(page)).toBeVisible();

    const input = page.getByRole("combobox", {
      name: "Search posts and projects",
    });
    await expect(input).toBeFocused();
    await input.fill(post.title);

    const option = page.getByRole("option").filter({ hasText: post.title });
    await expect(option.first()).toBeVisible();
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("mark").first()).toBeVisible();

    await input.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${post.route}$`));
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      post.title,
    );
    expect(consoleErrors).toEqual([]);
  });

  test("Esc and Cmd/Ctrl+K close the palette and return focus to the trigger", async ({
    page,
  }) => {
    await openHome(page);
    await page.keyboard.press("ControlOrMeta+K");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "search" })).toBeFocused();

    // The shortcut toggles: pressed again it closes and returns focus too.
    await page.keyboard.press("ControlOrMeta+K");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("ControlOrMeta+K");
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "search" })).toBeFocused();
  });

  test("/ opens the palette, and the header button does too", async ({
    page,
  }) => {
    await openHome(page);
    await page.keyboard.press("/");
    await expect(dialog(page)).toBeVisible();
    await page.getByRole("button", { name: /esc/ }).click();
    await expect(dialog(page)).toBeHidden();

    await page.getByRole("button", { name: "search" }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test("arrow keys move the active result and Tab stays inside", async ({
    page,
  }) => {
    await openHome(page);
    await page.keyboard.press("ControlOrMeta+K");
    const input = page.getByRole("combobox");
    // "site" appears in the post and on the projects page ("Live site").
    await input.fill("site");
    const options = page.getByRole("option");
    await expect(options.nth(1)).toBeVisible();

    await input.press("ArrowDown");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
    const activeId = await options.nth(1).getAttribute("id");
    await expect(input).toHaveAttribute("aria-activedescendant", activeId!);
    await input.press("ArrowUp");
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");

    // Tab cycles between the input and the close button only.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: /esc/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
  });

  test("Pagefind loads only when the palette opens", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r) => requests.push(new URL(r.url()).pathname));
    await openHome(page);
    expect(requests.filter((p) => p.startsWith("/pagefind/"))).toEqual([]);
    await page.keyboard.press("ControlOrMeta+K");
    await expect(page.getByRole("status")).toHaveText(/Type to search/);
    expect(requests).toContain("/pagefind/pagefind.js");
  });
});

for (const theme of ["light", "dark"] as const) {
  // UX review screenshots of the open palette (`pnpm ux:screenshots`).
  test.describe(`search palette, ${theme} theme`, { tag: "@ux" }, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    test("screenshot", async ({ page }, testInfo) => {
      await openHome(page);
      await page.keyboard.press("ControlOrMeta+K");
      await page.getByRole("combobox").fill("next");
      await expect(page.getByRole("option").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: path.join(UX_DIR, `search-${testInfo.project.name}-${theme}.png`),
        animations: "disabled",
        caret: "hide",
      });
    });
  });
}
