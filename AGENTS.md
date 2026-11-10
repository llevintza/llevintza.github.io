# AGENTS.md

Guidance for coding agents in this repo. Read [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md) and [web/README.md](web/README.md) for the details; this file holds the rules and decisions that are easy to miss.

## What this repo is

- **Live site today:** Jekyll (minima) at the repo root, served by GitHub Pages from `main` at https://llevintza.github.io/. Don't break it: `_config.yml`, `_data/`, `_includes/`, `*.md` pages.
- **Rebuild in progress:** Next.js (App Router, TypeScript strict, MDX, `output: 'export'`, `trailingSlash: true`) in [`web/`](web/), a standalone pnpm project. It replaces Jekyll at cutover (#38). Jekyll excludes `web/`, `design/` and `docs/`.
- **Project sites** under the same domain (`/email-icons/`, `/energlens/`, `/credit-desk-analytics/`, `/instrument-price-dashboard/`) are served from their own repos. Sent email signatures load icons from `/email-icons/`, so nothing here may break those URLs (see [ADR 0001](docs/adr/0001-hosting.md)).
- The backlog is GitHub issues: epics #2, #6, #10, #14, #20, #25, #28, #32 and #36, with stories as checklist items. Decisions are recorded in `docs/adr/` and in issue comments.

## Public content rules (the site is public)

- No phone number, `tel:`/`sms:`/Signal link, home address, or personal email address anywhere, including tests and fixtures. Use made-up `someone@example.com`-style values.
- Private repos appear **by name only, never linked**. Their live site may be linked. A private project has no repo link, enforced by the type in `web/content/featured.ts`.
- Featured project text mirrors the `## Building` table in the public `llevintza/llevintza` profile README. Use public sources only, never the private resume repo.
- No credentials in git, not even placeholders or example defaults.
- CI enforces most of this (`Public content guardrail`); the Jekyll site isn't scanned, so review it by hand.

## How changes land

- Feature branch `<type>/<issue>-<slug>` → PR against `main`. Never push to `main`.
- Conventional Commits for every commit and the PR title (husky and commitlint locally, checked in CI). PR body: summary, `Closes #N`, verification (commands and results), screenshots for visual changes.
- Required checks on `main` (commit and PR-title lint, web build, Lighthouse budgets, public content guardrail) are listed in [CONTRIBUTING.md](CONTRIBUTING.md#what-main-requires). All review conversations must be resolved; 0 approvals are required.
- Roles: **Rex**, **Arch** and **Helms** review in parallel; Helms owns technical direction; **Max** merges once the gate is clear. Docs-only PRs (no ADR, strategy, workflow, Dockerfile or code changes) need only Rex. Agents never merge. Every agent posts as the owner on GitHub, so prefix agent comments with a role tag (e.g. `[PR Author]`) and never use `gh pr review --approve`.
- After opening a PR, watch it: answer or fix every review comment, resolve the thread, merge `origin/main` on conflicts. Don't rebase or force-push a branch under review, especially one other PRs are stacked on.
- **Signal READY for Max.** When the PR is ready, the author posts a top-level comment that starts with `[PR Author] READY for Max`, with the head SHA and a one-line checklist. Max starts the merge on that signal. Post it only when all of these hold:
  - every review thread and conversation is resolved;
  - the required checks are green on the current head, and the PR is mergeable (`mergeStateStatus` CLEAN);
  - the required reviews are in on the current head, per the Roles line: Rex alone for docs-only PRs; otherwise Rex, Arch and Helms, with Arch on ADRs, strategy docs and code, Helms on ADRs, and Helms's `[workflows]` sign-off when the PR changes a workflow, CI or build config (including a Dockerfile or deploy/Pages config);
  - for `ux-review` PRs, the owner has approved the UX.

  After a push that changes the PR's own files, post a fresh READY only once the conditions hold again on the new head. A merge-only update from `origin/main` (no new changes from the PR) keeps the earlier reviews: reviewers still re-check the new head, but Rex's re-check doesn't block READY or merge. Arch's re-check is still required if that update touches an ADR or strategy doc, and Helms's `[workflows]` sign-off if it changes a workflow, CI or build config. Never post READY while anything is pending.
- **Visual changes** need Playwright screenshots at 390×844 and 1440×900, light and dark, the `ux-review` label, and the owner's UX approval before merge. Screenshots go on the orphan branch `ux-screenshots` under `pr-<n>/`.

## Working in `web/`

- Node 22.18+ (`web/.nvmrc`) and pnpm via corepack (version pinned in `packageManager`). Never add a `pnpm-workspace.yaml`. pnpm enforces a minimum release age, so don't pin a package published in the last few days.
- Before pushing, run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`, plus `pnpm check:contrast`, `pnpm check:public-content` and `pnpm lhci` when you touch styles, content or pages.
- Budgets (required): Lighthouse Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO 100 on `/`, `/projects/` and the newest post. WCAG AA contrast in both themes.
- On a `web/pnpm-lock.yaml` conflict: keep both sides in `package.json`, take main's lockfile, and re-run `pnpm install`. Never hand-edit the lockfile.
- Posts are `web/content/posts/YYYY-MM-DD-slug.mdx` with zod-validated frontmatter (`title`, `date`, `tags` in kebab-case, `summary`, `draft`). Permalinks keep Jekyll's shape, `/blog/:year/:month/:day/:slug/`.
- A new top-level route must be added to the own-site exclude regex in `lychee.toml` in the same PR. Otherwise its absolute canonical 404s the link check before deploy.
- Tests are hermetic: Playwright blocks external requests and serves fixtures, and unit tests mock `fetch`.

## Design

- Visual direction: **B, "Engineer's Console"** (#41, `design/`), refined into a **console-style theme inspired by typesafe.ai** (spec #60, implementation #61). Palette: signature blue `#3498DB` and navy `rgb(44,62,80)`, dark-first with a light theme. JetBrains Mono everywhere, including post prose (owner decision), plus Departure Mono for accents. Self-hosted, open-licensed fonts only.
- "Inspired by" means never copying another site's logo, name, copy, images or CSS.
- Theme switch: `data-theme="dark|light"` on `<html>` (next-themes). Style through tokens, never hard-coded colours or font families in pages.
- All motion turns off under `prefers-reduced-motion`, and animations must not cause layout shift (CLS < 0.05).
