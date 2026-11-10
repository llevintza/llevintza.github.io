import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type Route } from "@playwright/test";

/**
 * Hermetic network for every e2e test.
 *
 * - Requests to the local server (baseURL) go through untouched.
 * - Known externals are answered from committed fixtures in `e2e/fixtures/`.
 * - Anything else is aborted and fails the test with its URL.
 *
 * To support a new external, add a handler to EXTERNALS below plus its
 * fixture files; never let a test reach the real network.
 */

const FIXTURES = path.join(__dirname, "fixtures");

function githubFixture(url: URL): string {
  const slug = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "__");
  return path.join(FIXTURES, "github-api", `${slug}.json`);
}

type External = {
  /** Label for readers; not used at runtime. */
  name: string;
  match: (url: URL) => boolean;
  fulfill: (route: Route, url: URL) => Promise<void>;
};

const EXTERNALS: External[] = [
  {
    // Contact icons shared with the email signature (llevintza/email-icons).
    name: "email-icons",
    match: (url) =>
      url.hostname === "llevintza.github.io" &&
      url.pathname.startsWith("/email-icons/img/") &&
      url.pathname.endsWith(".png"),
    fulfill: async (route, url) => {
      const file = path.join(
        FIXTURES,
        "email-icons",
        path.basename(url.pathname),
      );
      const body = readFileSync(
        existsSync(file)
          ? file
          : path.join(FIXTURES, "email-icons", "placeholder.png"),
      );
      await route.fulfill({ status: 200, contentType: "image/png", body });
    },
  },
  {
    // GitHub REST API: `e2e/fixtures/github-api/<path, / as __>.json`, e.g.
    // GET /repos/llevintza/foo -> github-api/repos__llevintza__foo.json.
    // An API path with no fixture file counts as an unexpected request.
    name: "github-api",
    match: (url) =>
      url.hostname === "api.github.com" && existsSync(githubFixture(url)),
    fulfill: async (route, url) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: readFileSync(githubFixture(url)),
      });
    },
  },
];

type Fixtures = {
  /** External URLs the page tried to reach that have no fixture. */
  unexpectedRequests: string[];
  /** Console errors and uncaught page errors seen during the test. */
  consoleErrors: string[];
};

// The fixture callback is named `provide`, not Playwright's usual `use`, so
// the React hooks lint rule doesn't mistake it for React's `use()`.
export const test = base.extend<Fixtures>({
  unexpectedRequests: [
    async ({ context, baseURL }, provide) => {
      const local = new URL(baseURL!).origin;
      const unexpected: string[] = [];

      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === local) return route.continue();
        const external = EXTERNALS.find((e) => e.match(url));
        if (external) return external.fulfill(route, url);
        unexpected.push(url.href);
        return route.abort("blockedbyclient");
      });

      await provide(unexpected);

      expect(
        unexpected,
        "Unexpected external requests (add a fixture in e2e/fixtures.ts):",
      ).toEqual([]);
    },
    { auto: true },
  ],

  consoleErrors: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    await provide(errors);
  },
});

export { expect };
