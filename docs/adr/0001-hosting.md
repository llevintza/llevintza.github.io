# ADR 0001: Hosting for the rebuilt site

- **Status:** Proposed (the owner, Leo Levintza, decides)
- **Date:** 2026-11-09
- **Issue:** #39, part of epic #36 (Migration and cutover from Jekyll)
- **Sources checked:** 2026-11-09 (see [Sources](#sources)). Prices and limits change, so re-check them before acting on this record.

## Context

The site at `https://llevintza.github.io/` is Jekyll (minima). GitHub Pages builds it from `main` of
`llevintza/llevintza.github.io` (the legacy branch build). That repo has been **private** since 2026-11-09 while
the site stays public, which GitHub allows only on a paid plan (GitHub Pro here). The backlog rebuilds it in Next.js (App Router, TypeScript,
MDX) with `output: 'export'`, so the deployable result is a folder of static HTML, CSS and JS.

The `llevintza.github.io` host is shared. It serves the user site and also every project site the account
publishes. These URLs are live today (checked with `curl -I` on 2026-11-09):

| URL | Served from | Status today |
|---|---|---|
| `https://llevintza.github.io/` | this repo, private (user site, branch build) | 200 |
| `https://llevintza.github.io/email-icons/img/color/*.png` | public repo `email-icons` (project site, branch build) | 200, `cache-control: max-age=600` |
| `https://llevintza.github.io/energlens/` | public repo `energlens` (project site, Actions build) | 200 |
| `https://llevintza.github.io/credit-desk-analytics/` | public repo `credit-desk-analytics` (project site, Actions build) | 200 |
| `https://llevintza.github.io/instrument-price-dashboard/` | private repo `instrument-price-dashboard` (project site, Actions build, publicly visible) | 200 |

No site on the account has a custom domain today (`gh api repos/llevintza/<repo>/pages` → `cname: null` for all five).

**Shared-host precedence (constraint).** A project site claims `/<repo-name>/` ahead of the user site. So the new
site must never route under `/email-icons/`, `/energlens/`, `/credit-desk-analytics/` or
`/instrument-price-dashboard/`. No future repo with Pages turned on may be named after a user-site route (`blog`,
`projects`, `about`, …), or it silently shadows that route. #37 can test for this.

The `email-icons` URLs matter most. Email signatures that have already been sent embed
`<img src="https://llevintza.github.io/email-icons/img/color/...">`. We can't edit those emails, so those URLs must keep
returning images for years. The current Jekyll site also loads its contact icons from the same path
(`icons_base` in `_config.yml`).

The issue asks whether to stay on GitHub Pages or move to Vercel or Cloudflare Pages, which offer per-PR preview
deployments and server features.

## Decision drivers

1. **Don't break any URL people or emails already use** (epic #36). Above all, `/email-icons/...` and the three
   project sites.
2. **Per-PR previews** so reviewers (including Helms, Arch and Rex) can see a change before it merges.
3. **Cost:** no spend beyond the GitHub Pro plan the account already has.
4. **Low operational load:** one owner, few moving parts, no extra accounts or secrets unless they earn their place.
5. **Server features** (redirects, headers, functions) are nice to have. A static export can't use most of them
   anyway (see below).
6. **Analytics hooks** for ADR 0002 (being written separately). This record only notes what each host offers.

### What a static export gives up on any host

Next.js lists these as unsupported with `output: 'export'`: dynamic routes without `generateStaticParams()`, Route
Handlers that rely on the request, cookies, **rewrites, redirects, headers** (in `next.config`), proxy/middleware,
ISR, image optimisation with the default loader, Draft Mode, Server Actions and intercepting routes
([Next.js: Static Exports][next-export]). So a host's "server features" only help us through the host's own
config files (`vercel.json`, `_redirects`/`_headers`), not through Next.js.

## Options

### A. GitHub Pages, deployed by GitHub Actions (static export)

Build `web/` with `next build` in a workflow, upload `out/` with `actions/upload-pages-artifact`, and publish it with
`actions/deploy-pages` ([custom workflows][gh-workflows]). Once cutover happens, switch this repo's Pages source from
"Deploy from a branch" to "GitHub Actions". The URL stays `https://llevintza.github.io/`, and project sites are
unaffected.

- **Previews:** GitHub Pages has no general-purpose PR previews. `actions/deploy-pages` has a `preview` input, but
  its README says *"This feature is only in alpha currently and is not available to the public!"*
  ([actions/deploy-pages][deploy-pages]). Workarounds:
  - [`rossjrw/pr-preview-action`][pr-preview] deploys each PR to `/pr-preview/pr-N/` on a branch that Pages serves.
    It **requires "Deploy from a branch"**: *"GitHub Actions … does not work with this action"*. It also doesn't
    support PRs from forks. Previews would sit under the production host, so they'd need `noindex`, and the Next.js
    `basePath` would have to change per PR.
  - **Recommended workaround:** a preview-only workflow that pushes the PR build to a **Cloudflare Pages Direct
    Upload** project (`wrangler pages deploy out --branch pr-N`), which gets a `*.pages.dev` URL with
    `X-Robots-Tag: noindex` ([CF Direct Upload][cf-direct], [CF previews][cf-previews]). This needs a Cloudflare
    API token stored as a GitHub Actions secret, never in git. Fork PRs don't receive secrets, so they get no
    preview. Every PR in this repo comes from a branch, so that's acceptable. That workflow must keep three
    guardrails:
    - Trigger only on `pull_request`, never `pull_request_target`. The latter would hand the token to untrusted PR
      code.
    - Use an API token scoped to Cloudflare Pages Edit on this one account only.
    - Declare least-privilege `permissions:`, for example `contents: read`, plus `pull-requests: write` only if it
      comments the preview link.
  - The simplest fallback is to attach `out/` as a workflow artifact so reviewers can download it and run it locally.
- **Server features:** none. You can't set custom response headers (no CSP or HSTS control) and there are no
  server-side redirects. Redirects for moved Jekyll URLs (#37) would have to be static HTML stubs
  (`<meta http-equiv="refresh">` plus `rel="canonical"`), not real 301s.
- **Build minutes:** standard GitHub-hosted runners are free in public repositories and for GitHub Pages' own
  builds ([GitHub Actions billing][gh-actions-billing]). This repo is private, so a custom build-and-deploy workflow
  (and any preview workflow) draws on GitHub Pro's included Actions compute: $18/month, about 3,000 standard Linux
  minutes at $0.006/min ([GitHub included usage][gh-included], [GitHub Actions billing][gh-actions-billing]). A
  static-export build takes a few minutes, so this is far more than the site needs. The soft limit of 10 builds per hour doesn't apply to custom
  Actions workflows ([Pages limits][gh-limits]).
- **Limits:** published site ≤ 1 GB, soft bandwidth limit of 100 GB/month, deploys time out after 10 minutes,
  `429` rate limiting is possible, and it isn't allowed as free hosting *"to run your online business"*
  ([Pages limits][gh-limits]).
- **Private repos:** GitHub Free covers Pages in public repos only. GitHub Pro adds Pages from private repos
  ([GitHub plans][gh-plans]). This repo and `instrument-price-dashboard` are both private, so **the site depends on
  keeping GitHub Pro**: *"If you downgrade from GitHub Pro to GitHub Free, any GitHub Pages sites that are currently
  published from private repositories in your account will be unpublished"* ([GitHub: custom domains][gh-custom-domain]).
  `email-icons`, `energlens` and `credit-desk-analytics` are public, so they're unaffected.
- **Analytics hooks:** nothing built in. Any client-side script works, for example the Cloudflare Web Analytics JS
  beacon, which runs on sites not hosted on Cloudflare ([CF Web Analytics][cf-wa-start]). ADR 0002 covers this.

### B. Vercel (Hobby)

Connect the repo, and Vercel builds `web/` on every push.

- **Previews:** built in. Vercel creates a preview deployment for each push to a non-production branch and for each
  PR, then posts the link in the PR ([Vercel environments][vercel-envs]).
- **Server features:** functions, middleware and ISR, but only if we drop `output: 'export'`. With a static export
  you still get `vercel.json` redirects (308 by default) and custom headers ([vercel.json][vercel-json]).
- **Build minutes / limits (Hobby):** $0. 100 deployments/day, 45 min per build, 1 concurrent build, 100 GB/month
  Fast Data Transfer, 1 M CDN requests/month, 1 M function invocations/month. Builds on basic machines are
  "Included" ([Vercel pricing][vercel-pricing], [Vercel limits][vercel-limits]). If you exceed a limit on Hobby,
  *"you will have to wait until 30 days have passed before you can use the feature again"*
  ([Hobby plan][vercel-hobby]).
- **Pricing:** Pro costs $20 per developer seat per month, includes $20 of usage credit and 1 TB of transfer, then
  $0.15/GB ([Vercel pricing][vercel-pricing]).
- **Terms:** *"the Hobby plan restricts users to non-commercial, personal use only"* ([Hobby plan][vercel-hobby]). A
  personal portfolio fits that, but any paid or consulting use of the site would need Pro.
- **Private repos:** personal repos work on Hobby. Repos owned by a GitHub organisation need a paid team
  ([Vercel limits][vercel-limits]). Hobby has one seat and no viewer seats.
- **Analytics hooks:** Vercel Web Analytics on all plans, with 50,000 events/month on Hobby. When you hit the cap,
  collection pauses and can't be topped up ([Vercel analytics pricing][vercel-wa]).

### C. Cloudflare Pages (Free)

Connect the repo with the Git integration, or deploy from Actions with Direct Upload.

- **Previews:** built in. Every PR from the same repository gets a unique URL that updates on each push, and
  branches get aliases. Previews are public unless you put Cloudflare Access in front of them, and they send
  `X-Robots-Tag: noindex` ([CF previews][cf-previews]).
- **Server features:** `_redirects` (2,000 static + 100 dynamic rules, any of 301/302/303/307/308) and `_headers`
  (100 rules) work with a pure static export ([CF redirects][cf-redirects], [CF headers][cf-headers]). Pages
  Functions and Workers are there if we ever need them. For new full-stack Next.js apps Cloudflare now
  recommends Workers, while static export on Pages is still a documented, supported path
  ([CF Next.js guide][cf-next]).
- **Build minutes / limits (Free):** 500 builds/month per account, 1 concurrent build, 20-minute timeout,
  20,000 files per site, 25 MiB per file, 100 custom domains per project, unlimited preview deployments
  ([CF Pages limits][cf-limits]). Static asset requests are *"free and unlimited"*, and Cloudflare charges nothing
  for egress ([Workers pricing][cf-workers-pricing]).
- **Pricing:** $0 for this use. Workers Paid starts at $5/month, needed only for heavy Functions use
  ([Workers pricing][cf-workers-pricing]). Pages Pro and Business raise the build caps
  ([CF Pages limits][cf-limits]).
- **Private repos:** *"Both private and public repositories are supported"* ([CF Git integration][cf-git]). You
  can't switch a Git-connected project to Direct Upload later, so pick one mode per project.
- **Analytics hooks:** Cloudflare Web Analytics is free on all plans and you turn it on per project with one click
  ([CF Pages Web Analytics][cf-pages-wa]).

## The custom-domain effect (applies to every option)

A custom domain (say `leo.example`) is the usual reason to move hosts. It's also the change most likely to break
sent email, so here is what it does.

### What GitHub does

> "By default, if you set a custom domain for a user site or organization site, that same custom domain will be used
> for all project sites owned by the same account." ([GitHub: custom domains][gh-custom-domain])

GitHub's docs don't spell out the redirect, but the live behaviour is easy to see. Accounts that have a custom
domain on their user site return a **permanent redirect that keeps the full path** for every `github.io` URL (checked
2026-11-09 with `curl -I` against two public accounts):

```
GET https://mdo.github.io/code-guide/img/x.png  → 301 Location: https://codeguide.co/img/x.png
GET https://sindresorhus.github.io/x/y.png?a=1  → 301 Location: http://sindresorhus.com/x/y.png?a=1
```

The second example shows that the `Location` uses `http://` when "Enforce HTTPS" isn't on for the custom domain.
You can override the account default by giving an individual repo its own custom domain. But then that repo's
`github.io` URL redirects to *its* domain instead, so **no setting keeps `llevintza.github.io/email-icons/...`
serving a 200** once the user site has a custom domain. The only exception is privately published project sites,
which need GitHub Enterprise Cloud ([GitHub: custom domains][gh-custom-domain], [GitHub plans][gh-plans]).

### What that means for sent signatures

After the change, every icon request in an old email becomes
`301 → https://leo.example/email-icons/img/color/x.png`. That's still a 200 as long as `email-icons` stays a Pages
project site, because GitHub serves it under the custom domain.

Email clients fetch remote images through proxies:

- **Gmail** rewrites remote images to `googleusercontent.com` proxy URLs and fetches them from Google's servers
  ([Gmail images help][gmail-images], [Valsorda 2013][valsorda]). Community reports describe failed or blocked
  proxy fetches, and errors such as 404s, being *cached* by the proxy ([Suped][suped]).
- **Outlook.com** loads external images *"using an image proxy"* by default ([Microsoft support][outlook-proxy]).
- **Apple Mail** with Mail Privacy Protection downloads remote content *"privately … in the background when you
  receive a message"* through Apple's relay. Litmus describes it caching the images
  ([Apple support][apple-mpp], [Litmus][litmus-mpp]).

**Unverified:** none of these vendors documents whether its proxy follows a 301 on an `<img>` fetch. HTTP fetchers
generally do, and redirecting image URLs (open-tracking pixels, CDNs) are common. But we found no primary source,
so this ADR treats it as a **risk to test, not a fact**. The specific risks are:

1. **A proxy refuses or mishandles the redirect.** The icons break in that client for every email already sent, and
   a proxy that caches the failure can keep them broken after a fix ([Suped][suped]).
2. **An `http://` Location.** If HTTPS isn't enforced on the custom domain (it can lag while the certificate is
   issued), the redirect downgrades to HTTP. Proxies may refuse that, or flag it as insecure content.
3. **The 301 is permanent and cacheable.** Proxies and browsers may remember it. If we later remove the domain or
   point it at a non-GitHub host, cached redirects send old emails to a URL that no longer serves the icons.
4. **The domain becomes a dependency of every sent email.** If the domain lapses, every signature breaks. If someone
   else then registers it, they control the images shown in old emails.
5. **A domain on a non-GitHub host takes over `/email-icons/`.** If the user site gets a custom domain *and* that
   domain points at Vercel or Cloudflare, GitHub still redirects `llevintza.github.io/email-icons/...` to
   `leo.example/email-icons/...`. That host doesn't have those files, so the result is a 404 unless we proxy or
   copy them there.

### What happens to the project sites

| Path | No custom domain (recommended) | Custom domain on the user site |
|---|---|---|
| `/email-icons/...` | unchanged, 200 | 301 → `leo.example/email-icons/...`, risks 1–5 above |
| `/energlens/` | unchanged, 200 | 301 → `leo.example/energlens/` (the repo homepage URL and any links in READMEs go through a redirect) |
| `/credit-desk-analytics/` | unchanged, 200 | 301 → `leo.example/credit-desk-analytics/` |
| `/instrument-price-dashboard/` | unchanged, 200 | 301 → `leo.example/instrument-price-dashboard/`. This is publicly published, so the custom domain applies. It stays a Pages site from a private repo only while the account keeps GitHub Pro. |

All three apps are built by Actions with a fixed `basePath` (their own repo name), so the paths survive a host
change. Absolute `https://llevintza.github.io/...` URLs baked into their bundles (Open Graph, canonical) would point
through the redirect.

## Pros, cons and cost

| | A. GitHub Pages (Actions) | B. Vercel Hobby | C. Cloudflare Pages Free |
|---|---|---|---|
| Monthly cost | $0 extra (needs the existing GitHub Pro, because the repo is private) | $0 (Pro $20/seat) | $0 (Workers Paid $5 if ever needed) |
| PR previews | Not native. Alpha `preview` input isn't public. Use Cloudflare Direct Upload previews or downloadable artifacts | Native, per push and per PR | Native, per PR and per branch, `noindex` |
| Server-side redirects / headers | None (HTML meta-refresh stubs only) | `vercel.json` redirects + headers | `_redirects` + `_headers` |
| Functions / SSR | None | Yes (if we drop static export) | Pages Functions / Workers |
| Build limits | Private repo: Pro's $18/month included compute (~3,000 Linux min); no Pages build cap with Actions; 10-min deploy timeout | 100 deploys/day, 45-min build, 1 concurrent | 500 builds/month per account, 20-min build, 1 concurrent |
| Bandwidth | 100 GB/month (soft) | 100 GB/month, then a 30-day lockout | No egress charge for static assets |
| Private repo | Pro needed (this repo is private) | Personal repos OK | Supported |
| Terms | Not for running a business | Non-commercial only | No personal-only clause |
| Analytics | Bring your own script | Vercel Web Analytics, 50k events/mo | CF Web Analytics, free |
| `https://llevintza.github.io/` | Stays the real site | Needs a redirect stub on Pages | Needs a redirect stub on Pages |
| `/email-icons/` and project sites | Untouched | Untouched only if the user site keeps **no** custom domain | Same as B |
| Accounts / secrets added | None (one CF token if we take the preview workaround) | Vercel account + GitHub app | Cloudflare account + GitHub app or token |
| Moving parts at cutover | Switch Pages source to Actions | New host, DNS, redirect stub, two sites in sync | Same as B |

## Recommendation

**Stay on GitHub Pages, deployed by GitHub Actions from the static export (Option A), and don't set a custom domain on
the user site.** Get PR previews from a preview-only workflow that pushes each PR build to a Cloudflare Pages Direct
Upload project on `*.pages.dev`. Production stays on Pages, and the preview host can be dropped with no effect on
live URLs.

Why:

- It's the only option that changes **no** live URL. `/email-icons/`, `/energlens/`, `/credit-desk-analytics/` and
  `/instrument-price-dashboard/` keep returning 200 directly, and sent signatures don't depend on any proxy's
  redirect handling.
- Vercel and Cloudflare are clearly better at previews and headers. But with `output: 'export'` most of their server
  features go unused, and their extra value only shows up with a custom domain, which is exactly what triggers the
  redirect risk.
- It costs nothing beyond the existing GitHub Pro plan, needs no new production account, and makes the cutover (#38) one settings change, which can be undone (see [Rollback](#rollback)).

### If the owner wants a custom domain or another host anyway

Do it **without** putting a custom domain on the `llevintza.github.io` repo:

1. Host the new site on Vercel or Cloudflare at `leo.example`.
2. Keep `llevintza.github.io` on GitHub Pages **with no CNAME**, as a redirect stub. Every page is a small HTML file
   with `<meta http-equiv="refresh" content="0; url=https://leo.example/<same path>">`, `<link rel="canonical">`
   and a visible link, plus a `404.html` that redirects by JavaScript while keeping the path. Pages can't send a real
   301 without a custom domain, so this is a client-side redirect. Browsers and search engines follow it.
   `https://llevintza.github.io/` keeps redirecting this way for as long as the stub repo exists.
3. Because the user site has no custom domain, GitHub keeps serving `/email-icons/` and the three project sites
   directly from `llevintza.github.io` with a 200. The redirect stub only covers paths the user site itself owns.
4. Before relying on any redirect for email assets, send test signatures to Gmail, Outlook.com and Apple Mail (with
   Mail Privacy Protection on) and confirm the icons render through a 301 to an `https://` URL.

### Rollback

The source switch must stay reversible, so #38 implements these steps:

1. **Back to Jekyll.** Before #38 deletes the Jekyll files from `main`, keep the last Jekyll commit on a named branch
   (`jekyll-legacy`). To roll back, go to Settings → Pages → Source: "Deploy from a branch" → `jekyll-legacy` /
   root. Switching back to `main` alone won't work once the Jekyll sources are gone.
2. **Bad Next.js deploy after cutover.** Redeploy the last good build through `workflow_dispatch` on the Pages deploy
   workflow. The run stays on `main` and takes a `ref` input (a tag or SHA), which it checks out and builds. Don't
   run the workflow from the old ref itself: by default the `github-pages` environment's deployment-branch rule
   allows only `main`, so it would reject that deploy.
3. **Blast radius.** Neither path touches `/email-icons/` or the project sites, which are published from their own
   repos.
4. **After any switch or rollback**, confirm these return 200 with `curl -I`: `/`, `/feed.xml`,
   `/email-icons/img/color/linkedin.png`, `/energlens/`, `/credit-desk-analytics/` and
   `/instrument-price-dashboard/`.

## Consequences

- **Good:** no URL breaks at cutover, no new production vendor, no new cost, and previews become available.
- **Bad:** the public site depends on keeping GitHub Pro, because the source repo is private. A downgrade unpublishes
  it (and `/instrument-price-dashboard/`). Making this repo public again would remove that dependency for the user
  site, but `/instrument-price-dashboard/` would still need Pro while its repo is private. There are no real HTTP
  redirects or custom headers. Moved Jekyll URLs (#37) need HTML redirect stubs, and a CSP has to be a `<meta>` tag,
  not a header. The site stays on the `github.io` name.
- **Neutral:** previews add one secret (a Cloudflare API token scoped to Pages) and one workflow. If the owner skips
  them, reviewers use downloadable artifacts instead.
- **Follow-ups:** #38 switches the Pages source to "GitHub Actions" at cutover, keeping the
  [Rollback](#rollback) path (`jekyll-legacy` branch, `workflow_dispatch` redeploy, 200 checks). #37 maps old URLs to static stubs.
  ADR 0002 picks the analytics script. If a custom domain is ever wanted, it gets its own ADR that includes the email
  proxy test above.

## Sources

All checked on 2026-11-09.

- [GitHub: About custom domains and GitHub Pages][gh-custom-domain]
- [GitHub Pages limits][gh-limits]
- [GitHub: Using custom workflows with GitHub Pages][gh-workflows]
- [GitHub's plans][gh-plans]
- [GitHub Actions billing][gh-actions-billing]
- [GitHub: product usage included with each plan][gh-included]
- [actions/deploy-pages README (`preview` input)][deploy-pages]
- [rossjrw/pr-preview-action README][pr-preview]
- [Next.js: Static Exports, unsupported features][next-export]
- [Vercel pricing][vercel-pricing]
- [Vercel Hobby plan][vercel-hobby]
- [Vercel limits][vercel-limits]
- [Vercel deployment environments (previews)][vercel-envs]
- [Vercel `vercel.json` (redirects, headers)][vercel-json]
- [Vercel Web Analytics limits and pricing][vercel-wa]
- [Cloudflare Pages limits][cf-limits]
- [Cloudflare Pages preview deployments][cf-previews]
- [Cloudflare Pages redirects][cf-redirects] and [headers][cf-headers]
- [Cloudflare Pages Next.js guide][cf-next]
- [Cloudflare Pages Git integration][cf-git]
- [Cloudflare Pages Direct Upload][cf-direct]
- [Cloudflare Workers pricing][cf-workers-pricing]
- [Cloudflare Web Analytics on Pages][cf-pages-wa] and [on any site][cf-wa-start]
- [Gmail: images in email][gmail-images]
- [Filippo Valsorda: How the new Gmail image proxy works (2013)][valsorda]
- [Suped: why images intermittently fail in Gmail][suped]
- [Microsoft: External image protection in Outlook.com][outlook-proxy]
- [Apple: Protect email privacy in Mail][apple-mpp]
- [Litmus: Apple Mail Privacy Protection for marketers (2021)][litmus-mpp]
- Live HTTP checks with `curl -I` against `llevintza.github.io`, `mdo.github.io` and `sindresorhus.github.io`
  (2026-11-09)

[gh-custom-domain]: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
[gh-limits]: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
[gh-workflows]: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
[gh-plans]: https://docs.github.com/en/get-started/learning-about-github/githubs-plans
[gh-actions-billing]: https://docs.github.com/en/billing/concepts/product-billing/github-actions
[gh-included]: https://docs.github.com/en/billing/reference/product-usage-included
[deploy-pages]: https://github.com/actions/deploy-pages
[pr-preview]: https://github.com/rossjrw/pr-preview-action
[next-export]: https://nextjs.org/docs/app/guides/static-exports
[vercel-pricing]: https://vercel.com/pricing
[vercel-hobby]: https://vercel.com/docs/plans/hobby
[vercel-limits]: https://vercel.com/docs/limits
[vercel-envs]: https://vercel.com/docs/deployments/environments
[vercel-json]: https://vercel.com/docs/project-configuration/vercel-json
[vercel-wa]: https://vercel.com/docs/analytics/limits-and-pricing
[cf-limits]: https://developers.cloudflare.com/pages/platform/limits/
[cf-previews]: https://developers.cloudflare.com/pages/configuration/preview-deployments/
[cf-redirects]: https://developers.cloudflare.com/pages/configuration/redirects/
[cf-headers]: https://developers.cloudflare.com/pages/configuration/headers/
[cf-next]: https://developers.cloudflare.com/pages/framework-guides/nextjs/
[cf-git]: https://developers.cloudflare.com/pages/get-started/git-integration/
[cf-direct]: https://developers.cloudflare.com/pages/get-started/direct-upload/
[cf-workers-pricing]: https://developers.cloudflare.com/workers/platform/pricing/
[cf-pages-wa]: https://developers.cloudflare.com/pages/how-to/web-analytics/
[cf-wa-start]: https://developers.cloudflare.com/web-analytics/get-started/
[gmail-images]: https://support.google.com/mail/answer/145919
[valsorda]: https://words.filippo.io/how-the-new-gmail-image-proxy-works-and-what-this-means-for-you/
[suped]: https://www.suped.com/email-deliverability/answers/why-are-images-intermittently-failing-to-load-in-gmail
[outlook-proxy]: https://support.microsoft.com/en-us/outlook/external-image-protection-in-outlook-com
[apple-mpp]: https://support.apple.com/guide/mail/protect-email-privacy-mlhlp1205/mac
[litmus-mpp]: https://www.litmus.com/blog/apple-mail-privacy-protection-for-marketers
