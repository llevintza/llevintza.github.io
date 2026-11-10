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

## Repo list cache

`/projects/` lists public repos from the GitHub API at build time and falls back to the committed `content/repos.cache.json` when the API fails, so keep that file under 14 days old: run `pnpm refresh:repos` (it prints what changed and leaves no diff when nothing did), commit the file and open a PR. `pnpm refresh:repos --check` prints the cache age without fetching.

`.github/workflows/repo-cache.yml` runs that check every Monday (and on demand). When the cache is older than 14 days it opens or updates one `chore` issue, "Repo cache is N days old: run pnpm refresh:repos and open a PR", and closes it once a refresh has landed.

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

CI (`.github/workflows/lighthouse.yml`, check **Lighthouse budgets**) runs Lighthouse on every PR against the static export and fails when a budget is missed: Performance ≥ 95, Accessibility = 100, Best Practices ≥ 95, SEO = 100. It tests `/`, `/projects/`, `/projects/credit-desk-analytics/` and the newest blog post (5 mobile runs each, median), then posts a sticky `[Lighthouse]` comment with the scores and a link to the HTML reports artifact. The config is `lighthouserc.cjs`.

Run it locally (needs Chrome installed):

```sh
pnpm build
pnpm lhci autorun   # collect, assert, write reports
open .lighthouseci/reports/*.report.html
```

`pnpm lhci` runs a pinned `@lhci/cli` through `pnpm dlx`, so it adds no dependency. Reports stay local (`upload.target: filesystem`); nothing goes to public storage.

## Analytics and Search Console

Two build-time variables, both empty by default, turn on the only third-party tags ([ADR 0002](../docs/adr/0002-analytics.md)):

- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` renders the cookie-free Umami Cloud script (`components/analytics/`) and the analytics note on About.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` renders the `<meta name="google-site-verification">` tag (`siteVerification()` in `lib/site/metadata.ts`).

Only the deploy build on `main` gets them, from GitHub Actions variables; CI, Lighthouse, e2e and PR builds never do. Never commit a real value. To see the on-state locally, pass made-up values to `pnpm build`. The owner's setup steps are in [docs/runbooks/analytics-setup.md](../docs/runbooks/analytics-setup.md).

## Rich posts

Posts can use these extras on top of Markdown. `content/posts/2026-11-09-rebuilding-this-site.mdx` shows all of them.

- **Table of contents**: added automatically when a post has more than 3 h2/h3 headings. It's a sticky aside on wide screens and a collapsible `contents` box on phones, rendered without JavaScript. Heading ids come from `rehype-slug`, and `lib/content/toc.ts` runs the same plugins so the links match.
- **Callouts**: `<Callout type="note|tip|warn" title="optional">…</Callout>`.
- **Images**: `![alt text](/images/posts/<slug>/file.svg)`. Put files in `public/images/posts/<slug>/`. Width and height are read at build time, so the page doesn't shift when an image loads. Images load lazily and open full size in a dialog (Esc or the close button returns focus).
- **Mermaid diagrams**: a fenced ` ```mermaid ` block. See below.

### Mermaid diagrams

Diagrams are rendered to SVG **at build time**, once with the light theme and once with the dark one. CSS shows the one matching `data-theme`, and no Mermaid code reaches the browser. Rendering needs a headless browser (Playwright's Chromium), so the SVGs are cached in the repo:

- `content/diagrams/<hash>-light.svg` and `<hash>-dark.svg`, where the hash covers the diagram source, the Mermaid version, the theme config in `lib/content/mermaid.ts` and a renderer version.
- `pnpm build` uses the cached SVG when it exists. On a miss it renders the diagram locally (`lib/content/mermaid-render.mjs`, run in a child process) and writes the files.
- In CI (`CI` is set), a miss fails the build and names the post, the diagram and the missing files. CI never downloads a browser.

When you add or change a diagram, or bump Mermaid or the theme:

`mermaid` is pinned exactly in `devDependencies` (a test checks it matches the version mermaid-isomorphic renders with), because a Mermaid bump changes every hash. A Mermaid update, including a Dependabot PR, needs this local re-render too, or CI fails with `DiagramCacheMissError`.

```sh
pnpm exec playwright install chromium   # once per machine
pnpm build                              # renders the new SVGs
git add content/diagrams/
```

Old cache files aren't removed automatically. Delete the folder and rebuild to prune them. Mermaid's long decimals are rounded to 2 places when an SVG is written, so the public-content guardrail doesn't mistake coordinates for phone numbers.

## Case study video

A case study can embed one self-hosted walkthrough video (#111). `content/projects/allocator-memo-builder.mdx` shows it:

```yaml
video:
  file: walkthrough.mp4 # public/projects/<slug>/
  poster: walkthrough-poster.webp # WebP or PNG; gives the player its size
  captions: walkthrough.en.vtt # optional WebVTT, English; needed when there's narration
  title: Video walkthrough # visible heading and the player's accessible name
  summary: What the video shows, in words.
```

The files live in `public/projects/<slug>/`. The build fails if one is missing, if a field is unknown, or, for a private project, if any of the text links its repo. `CaseStudyVideo` renders native controls with `preload="none"`, and no autoplay or loop.

**Media policy.** Git history is permanent. Every re-encode adds its full size to the repo, and anything pushed to a PR branch stays in GitHub's object store even after an amend or force-push. So:

- **Budget:** about 6 MB per video, one rendition only: H.264 (yuv420p) MP4 with `-movflags +faststart`, plus a WebP poster. Lower the frame rate before the bitrate if UI text must stay readable. Keep audio only if it carries meaning, such as narration, and caption it.
- **Review before the first push.** The public-content guardrail checks text, not pixels or sound. Do all of this before the file is ever pushed:
  - look at every frame (`ffmpeg -i in.mp4 -vf fps=1/2 frames/%03d.png`): keys, tokens, emails, usernames, home-dir paths, browser tabs, bookmarks, notifications, real fund or company data, and private repo URLs;
  - check the narration against the captions, and that neither names a URL, repo path or private name;
  - check the container metadata: `ffprobe -show_entries format_tags:stream_tags in.mp4`.
- Report the review in the PR: frames reviewed, findings and what was cut, plus final size, duration and resolution.
