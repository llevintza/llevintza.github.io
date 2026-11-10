# End-to-end tests (Playwright)

Smoke tests and UX screenshots for the static export in `web/out/`, run in
Chromium against the production build served as plain files (as GitHub Pages
serves them).

## Running locally

```sh
cd web
pnpm exec playwright install chromium   # once per Playwright version
pnpm test:e2e         # smoke tests (builds first)
pnpm ux:screenshots   # full-page screenshots into web/ux-screenshots/
```

- `PW_SKIP_BUILD=1` reuses an existing `out/` instead of running `pnpm build`.
- `PW_PORT` changes the local server port (default `4321`). The config never
  reuses a server that's already running, so a port clash fails loudly.
- `pnpm exec playwright show-report` opens the HTML report from the last run.

Two projects run every spec:

| Project   | Browser  | Viewport | Notes                         |
| --------- | -------- | -------- | ----------------------------- |
| `desktop` | Chromium | 1440x900 |                               |
| `phone`   | Chromium | 390x844  | `isMobile`, `hasTouch`, DPR 2 |

## What's tested

- **`smoke.spec.ts`**: for every route: HTTP 200, exactly one visible `<h1>`,
  no broken images (each `img` is complete with `naturalWidth > 0`), and no
  console errors or uncaught page errors.
  - A theme test checks that the toggle flips `[data-theme]` and that the
    choice persists across reloads.
  - The phone navigation test (the nav reaches every top-level page) is
    `test.fixme` until the header lands in
    [#8](https://github.com/llevintza/llevintza.github.io/issues/8).
- **`ux.spec.ts`** (tagged `@ux`): full-page screenshots of every route, per
  project, in both `colorScheme` light and dark, with reduced motion and
  animations disabled. Files are named
  `ux-screenshots/<route-slug>-<project>-<theme>.png`, where `/` is `home` and
  `/blog/my-post/` is `blog-my-post`. The folder is gitignored.
- **`hermetic.spec.ts`**: self-tests for the network fixture below.

### Routes

`routes.ts` reads every `<loc>` from `out/sitemap.xml` once the sitemap exists
([#29](https://github.com/llevintza/llevintza.github.io/issues/29)). Until
then it uses `/`, `/blog/`, `/projects/`, `/about/` plus every post permalink
found as `out/blog/**/index.html`. New pages are covered automatically.

## Hermetic network

Every test imports `test` and `expect` from `./fixtures`, never directly from
`@playwright/test`. The auto fixture there routes every request:

- the local server: passed through;
- known externals: answered from committed files in `e2e/fixtures/`:
  - `llevintza.github.io/email-icons/img/**.png` →
    `fixtures/email-icons/<name>.png` (falls back to `placeholder.png`);
  - `api.github.com/<path>` → `fixtures/github-api/<path with / as __>.json`,
    e.g. `/repos/llevintza/foo` → `repos__llevintza__foo.json`;
- anything else: aborted, and the test fails listing the URLs.

To allow a new external, add an entry to `EXTERNALS` in `fixtures.ts` and
commit its fixture files. Don't let tests reach the real network.

## CI: `.github/workflows/e2e.yml`

On every pull request that touches `web/`:

1. **Playwright** job (read-only token): installs dependencies and Chromium
   (browsers cached per Playwright version), builds, runs `pnpm test:e2e` and
   then `pnpm ux:screenshots` (screenshots still run when a smoke test fails),
   and uploads the `ux-screenshots` and `playwright-report` artifacts.
2. **Publish UX screenshots** job (`contents: write`, `pull-requests: write`;
   it never runs PR code): copies the PNGs to the orphan branch
   `ux-screenshots` under `pr-<number>/`, replacing earlier ones, and upserts
   one sticky PR comment starting with `[UX Screenshots]`: a table of routes
   by phone and desktop, in dark and light, plus links to the artifact and the
   run. It's skipped on PRs from forks, which keep only the artifact.

The check isn't required. A concurrency group per PR cancels superseded runs.
