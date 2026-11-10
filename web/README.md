# web/: Next.js rebuild

The Next.js version of https://llevintza.github.io/, built as a static export. It lives here until cutover; the Jekyll site at the repo root keeps serving until then.

Stack: Next.js (App Router), TypeScript (`strict`), ESLint (flat config: `next/core-web-vitals` + TypeScript) and Prettier, with pnpm. The visual design isn't chosen yet, so the pages are unstyled placeholders.

## Run it

Use Node 22 (`nvm use` reads `.nvmrc`) and pnpm through corepack (`package.json` pins the version):

```sh
corepack enable pnpm
pnpm install
pnpm dev          # http://localhost:3000
```

| Script                              | What it does                                                     |
| ----------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                          | Dev server with hot reload                                       |
| `pnpm build`                        | Static export to `out/` (`/blog/` becomes `out/blog/index.html`) |
| `pnpm start`                        | Serves `out/` as static files (run `pnpm build` first)           |
| `pnpm lint`                         | ESLint                                                           |
| `pnpm typecheck`                    | `next typegen` (route types), then `tsc --noEmit`                |
| `pnpm format` / `pnpm format:check` | Prettier write / check                                           |

`next.config.ts` sets `output: 'export'`, `trailingSlash: true` (URLs match the Jekyll site) and `images.unoptimized` (static export has no image optimizer).

## Link checking

`.github/workflows/links.yml` runs on every PR, on pushes to `main`, weekly (Monday 06:00 UTC) and on demand:

- **Link check**: builds `web/` and runs [lychee](https://lychee.cli.rs/) over `out/**/*.html` with the config in `/lychee.toml`. Internal links resolve against `out/` (`/blog/` must have `out/blog/index.html`); external links are checked with retries and a one-day result cache. Hosts that block bots (LinkedIn, X, Zoom) are excluded.
- **Email icon URLs**: checks that every icon URL in `.github/email-icon-urls.txt` returns 200 with an `image/*` type. Sent email signatures load these from `https://llevintza.github.io/email-icons/`, so they must never break. When the signatures gain an icon, add its URL there.

A failed weekly run opens (or comments on) one issue titled `Broken links detected`. To run the link check locally (from the repo root, after `pnpm build`):

```sh
brew install lychee
lychee --config lychee.toml --root-dir "$PWD/web/out" 'web/out/**/*.html'
```

## Lighthouse

CI (`.github/workflows/lighthouse.yml`, check **Lighthouse budgets**) runs Lighthouse on every PR against the static export and fails when a budget is missed: Performance ≥ 95, Accessibility = 100, Best Practices ≥ 95, SEO = 100. It tests `/`, `/projects/` and the newest blog post (3 mobile runs each, median), then posts a sticky `[Lighthouse]` comment with the scores and a link to the HTML reports artifact. The config is `lighthouserc.cjs`.

Run it locally (needs Chrome installed):

```sh
pnpm build
pnpm lhci autorun   # collect, assert, write reports
open .lighthouseci/reports/*.report.html
```

`pnpm lhci` runs a pinned `@lhci/cli` through `pnpm dlx`, so it adds no dependency. Reports stay local (`upload.target: filesystem`); nothing goes to public storage.
