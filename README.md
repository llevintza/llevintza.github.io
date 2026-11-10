# llevintza.github.io

Source of https://llevintza.github.io/: a blog plus a portfolio of my projects, live sites and public repos. GitHub Pages builds it with Jekyll (the minima theme) from `main`.

Project sites (`/energlens/`, `/credit-desk-analytics/`, `/instrument-price-dashboard/`, `/email-icons/`, …) are served from their own repos under this same domain. They're unaffected by this repo.

## Next.js rebuild (in progress)

The site is being rebuilt in Next.js (App Router, TypeScript, static export) in [`web/`](web/), a standalone pnpm project. Until cutover, Jekyll at the repo root keeps serving the live site, and `_config.yml` excludes `web/` so Jekyll ignores it. See [`web/README.md`](web/README.md) to run it.

## How changes land

Every change reaches `main` through a feature branch and a pull request; nothing is pushed straight to `main`. The ruleset on `main` requires these checks to pass before a PR can merge:

| Check | Workflow | What it checks |
|---|---|---|
| **Commit messages** | `conventional-commits.yml` | Every commit in the PR follows Conventional Commits |
| **PR title** | `conventional-commits.yml` | The PR title follows Conventional Commits |
| **Web: lint, typecheck, build** | `ci.yml` | In `web/`: Prettier, ESLint, `tsc` and the static export build. It reports on every PR, and skips the heavy steps when `web/` is unchanged |

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch names, commit and PR conventions, and how reviews and merges work.

## Layout

| Path | What |
|---|---|
| `index.md` | Home: intro, contact links, featured projects, latest posts |
| `projects.md` | Featured projects, plus an automatic table of every public, non-fork repo |
| `blog.md`, `_posts/` | Blog. RSS feed at `/feed.xml` |
| `about.md` | Bio, now, selected work, certifications, education |
| `_data/featured.yml` | Featured projects (mirrors the profile README's "Building" table) |
| `_config.yml` | Site settings, contact links, `repo_exclude` for the automatic repo table |
| `_includes/` | `featured.html` (project cards), `contacts.html` (icon links) |
| `assets/main.scss` | minima plus a few styles of my own |

## Writing a post

Add `_posts/YYYY-MM-DD-slug.md`:

```markdown
---
layout: post
title: "Post title"
tags: [ai-sdlc, distributed-systems]
---

First paragraph becomes the excerpt on the blog page.
```

Open a PR; once it merges to `main`, Pages rebuilds in about a minute. Drafts can sit in `_drafts/`, which never publishes.

## Rules (this is public)

Everything here is public, so the rules from `llevintza/llevintza/CLAUDE.md` apply:

- No phone number, home address, compensation, client names under NDA, or anything marked `visibility: private` in `resume-data`.
- Private repos appear as plain names with **no repo link**, because the link would 404 for visitors. Their live site may be linked. Access is "On request".
- Featured project text mirrors the profile README's `## Building` table. Change both together.
- The automatic repo table lists every public, non-fork, non-archived repo. To hide one, add its name to `repo_exclude` in `_config.yml`. It only refreshes when the site rebuilds (a merge to `main`, or Re-run in the Pages build).

## Icons

Contact icons load from https://llevintza.github.io/email-icons/img/color/ (the `llevintza/email-icons` repo), the same files the email signature uses.

## Local preview (optional)

macOS's built-in Ruby 2.6 is too old. Install a newer one, for example with `brew install ruby`, then run `bundle install && bundle exec jekyll serve`. The automatic repo table needs a GitHub token locally (`JEKYLL_GITHUB_TOKEN`), and is empty without one.
