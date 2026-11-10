# llevintza.github.io

Source of https://llevintza.github.io/: a blog plus a portfolio of my projects, live sites and public repos. It's a Next.js static export in [`web/`](web/), built and deployed to GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main` that touches `web/`, and weekly on Mondays.

Project sites (`/energlens/`, `/credit-desk-analytics/`, `/instrument-price-dashboard/`, `/email-icons/`, …) are served from their own repos under this same domain. They're unaffected by this repo.

## The site

Next.js (App Router, TypeScript strict, MDX, `output: 'export'`) in [`web/`](web/), a standalone pnpm project. It replaced the original Jekyll site at the cutover on 2026-11-10 (#38); the Jekyll source was removed afterwards. See [`web/README.md`](web/README.md) for every script.

## How changes land

Every change reaches `main` through a feature branch and a pull request; nothing is pushed straight to `main`. The ruleset on `main` requires five checks to pass before a PR can merge; [`CONTRIBUTING.md`](CONTRIBUTING.md#what-main-requires) lists them.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch names, commit and PR conventions, and how reviews and merges work.

## Layout

| Path | What |
|---|---|
| `web/app/` | Routes: home, `/blog/`, `/projects/`, `/about/`, `/feed.xml`, `/sitemap.xml` |
| `web/content/posts/` | Blog posts (MDX) |
| `web/content/featured.ts` | Featured projects (mirrors the profile README's "Building" table) |
| `web/content/about.ts`, `web/content/contact.ts` | About page and contact links |
| `web/content/repos.cache.json` | Fallback for the automatic repo table on `/projects/` |
| `docs/` | ADRs and runbooks |

## Local preview

Use Node 22 (`web/.nvmrc`) and pnpm through corepack:

```sh
cd web
corepack enable pnpm
pnpm install
pnpm dev          # http://localhost:3000
```

`pnpm build && pnpm start` builds the static export to `web/out/` and serves it, which is what Pages serves.

## Writing a post

Add `web/content/posts/YYYY-MM-DD-slug.mdx`:

```mdx
---
title: Post title
date: 2026-11-10
tags: [ai-sdlc, distributed-systems]
summary: One or two sentences for the blog list, the feed and link previews.
draft: false
---

Post body in MDX.
```

The frontmatter is validated at build time and unknown fields fail the build: `title`, `date` (must match the file name), `tags` (kebab-case, may be `[]`) and `summary` are required; `draft` defaults to `false`, and `draft: true` shows the post in `pnpm dev` but leaves it out of production builds. The post is served at `/blog/YYYY/MM/DD/slug/`, the same permalink shape the Jekyll site used. Open a PR; once it merges to `main`, the deploy workflow publishes it in a few minutes.

## Rules (this is public)

Everything here is public, so the rules from `llevintza/llevintza/CLAUDE.md` apply:

- No phone number, home address, compensation, client names under NDA, or anything marked `visibility: private` in `resume-data`.
- Private repos appear as plain names with **no repo link**, because the link would 404 for visitors. Their live site may be linked. Access is "On request".
- Featured project text mirrors the profile README's `## Building` table. Change both together.
- The automatic repo table lists every public, non-fork, non-archived repo. To hide one, add its name to `REPO_EXCLUDE` in `web/lib/projects/repos.ts`. It only refreshes when the site rebuilds (a merge to `main` that touches `web/`, the weekly Monday run, or a manual run of "Deploy site").

## Icons

The site's contact icons are copies of the `llevintza/email-icons` colour set, served from `/icons/contact/` (`web/content/contact.ts`). Sent email signatures keep loading theirs from https://llevintza.github.io/email-icons/img/color/, served by that repo, so nothing here may break those URLs.

## Public content rules

The Next.js site in `web/` is checked on every PR and push to `main` by the **Public content guardrail** job ([`.github/workflows/public-content.yml`](.github/workflows/public-content.yml)). It builds the static export and runs [`web/scripts/check-public-content.mjs`](web/scripts/check-public-content.mjs) over every `.html`, `.xml` and `.txt` file in `web/out/`, failing with file, line and match when it finds:

- a phone number, in international (`+…`) or US format, with or without separators;
- a `tel:` or `sms:` link, or a Signal link (`signal.me`, `signal.group`, `sgnl.link`);
- a personal email address: any `mailto:` link, or any address at a consumer mail domain (Gmail, Outlook, iCloud, Yahoo, Proton and similar);
- a link to `github.com/llevintza/<name>` for a featured project marked private (`access: "private"` in `web/content/featured.ts`), or for a repo on the script's always-private list (`ALWAYS_PRIVATE_REPOS`, starting with this site's own repo). Private projects appear by name only; their live site may still be linked.

It scans the built export, so it covers everything the site serves.

Run it locally from `web/` with `pnpm build && pnpm check:public-content`, and its tests with `pnpm test:public-content`. The rules come from the public profile repo's `CLAUDE.md`. Never put a real address or number in the tests or fixtures, even to prove the check works.
