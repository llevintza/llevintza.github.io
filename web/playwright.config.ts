import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// A dedicated port so a local `next dev` on :3000 doesn't collide.
const port = Number(process.env.PW_PORT ?? 4321);
const baseURL = `http://127.0.0.1:${port}`;
const outDir = path.join(__dirname, "out");

// Build the static export once, before any spec file is loaded: the route
// list in e2e/routes.ts is read from `out/`, so it must exist when Playwright
// collects tests (that happens before `webServer` starts). Workers inherit
// PW_BUILT, so they don't rebuild. PW_SKIP_BUILD=1 reuses an existing `out/`.
if (!process.env.PW_BUILT) {
  if (process.env.PW_SKIP_BUILD === "1") {
    if (!existsSync(outDir)) {
      throw new Error(
        "PW_SKIP_BUILD=1 but web/out/ is missing: run `pnpm build` first.",
      );
    }
  } else {
    // REPOS_OFFLINE=1: /projects/ builds from content/repos.cache.json, so
    // the e2e build never calls the GitHub API (#22).
    execSync("pnpm build", {
      cwd: __dirname,
      stdio: "inherit",
      env: { ...process.env, REPOS_OFFLINE: "1" },
    });
  }
  process.env.PW_BUILT = "1";
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Service workers would bypass page.route(); keep the network hermetic.
    serviceWorkers: "block",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // Serve the production export exactly as GitHub Pages would: plain files.
    command: `pnpm exec serve out --no-clipboard --listen tcp://127.0.0.1:${port}`,
    url: baseURL,
    // Never reuse: another checkout may be serving a different out/ here.
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 60_000,
  },
});
