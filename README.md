# llevintza.github.io

Source of https://llevintza.github.io/: a blog plus a portfolio of my projects, live sites and public repos. GitHub Pages builds it with Jekyll (the minima theme) from `main`; there's no CI pipeline to maintain.

Project sites (`/energlens/`, `/credit-desk-analytics/`, `/instrument-price-dashboard/`, `/email-icons/`, …) are served from their own repos under this same domain. They're unaffected by this repo.

## Next.js rebuild (in progress)

The site is being rebuilt in Next.js (App Router, TypeScript, static export) in [`web/`](web/). Until cutover, Jekyll at the repo root keeps serving the live site, and `_config.yml` excludes `web/` so Jekyll ignores it. See [`web/README.md`](web/README.md) to run it.

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

Push or merge to `main`. Pages rebuilds in about a minute. Drafts can sit in `_drafts/`, which never publishes.

## Rules (this is public)

Everything here is public, so the rules from `llevintza/llevintza/CLAUDE.md` apply:

- No phone number, home address, compensation, client names under NDA, or anything marked `visibility: private` in `resume-data`.
- Private repos appear as plain names with **no repo link**, because the link would 404 for visitors. Their live site may be linked. Access is "On request".
- Featured project text mirrors the profile README's `## Building` table. Change both together.
- The automatic repo table lists every public, non-fork, non-archived repo. To hide one, add its name to `repo_exclude` in `_config.yml`. It only refreshes when the site rebuilds (a push, or Re-run in the Pages build).

## Icons

Contact icons load from https://llevintza.github.io/email-icons/img/color/ (the `llevintza/email-icons` repo), the same files the email signature uses.

## Local preview (optional)

macOS's built-in Ruby 2.6 is too old. Install a newer one, for example with `brew install ruby`, then run `bundle install && bundle exec jekyll serve`. The automatic repo table needs a GitHub token locally (`JEKYLL_GITHUB_TOKEN`), and is empty without one.

## Public content rules

The Next.js site in `web/` is checked on every PR and push to `main` by the **Public content guardrail** job ([`.github/workflows/public-content.yml`](.github/workflows/public-content.yml)). It builds the static export and runs [`web/scripts/check-public-content.mjs`](web/scripts/check-public-content.mjs) over every `.html`, `.xml` and `.txt` file in `web/out/`, failing with file, line and match when it finds:

- a phone number, in international (`+…`) or US format, with or without separators;
- a `tel:` or `sms:` link, or a Signal link (`signal.me`, `signal.group`, `sgnl.link`);
- a personal email address: any `mailto:` link, or any address at a consumer mail domain (Gmail, Outlook, iCloud, Yahoo, Proton and similar);
- a link to `github.com/llevintza/<name>` for a featured project marked private (`access: "private"` in `web/content/featured.ts`, or `private: true` in `_data/featured.yml` until that file exists). Private projects appear by name only; their live site may still be linked.

It covers the Next.js export only; the Jekyll site served today is not scanned, so until cutover the rules above are kept by review.

Run it locally from `web/` with `pnpm build && pnpm check:public-content`, and its tests with `pnpm test:public-content`. The rules come from the public profile repo's `CLAUDE.md`. Never put a real address or number in the tests or fixtures, even to prove the check works.
