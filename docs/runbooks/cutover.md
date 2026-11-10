# Runbook: cut over from Jekyll to the Next.js site

- **Issue:** #38 (epic #36). Hosting: [ADR 0001](../adr/0001-hosting.md), GitHub Pages deployed by GitHub Actions, no custom domain.
- **Who runs it:** Leo only. Every step changes a repo setting or the live site.
- **Workflow:** [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) ("Deploy site").
- **Verification script:** `web/scripts/verify-live.mjs` (`pnpm verify:live`).
- **Expected time:** about 15 minutes for the switch and checks. A rollback takes 5 to 15 minutes (see [Rollback](#rollback)).

## How the gate works

`deploy.yml` runs on every push to `main` that touches `web/**`, weekly on a schedule (Mondays 04:17 UTC, #23), and by hand. Its `build` job always builds `web/out` and uploads it as the Pages artifact. Its `deploy` job runs only when **both** of these hold:

1. The repo variable `PAGES_DEPLOY_ENABLED` is `true`. Until it is, the job is skipped.
2. The Pages source is "GitHub Actions" (`build_type=workflow`). With the current source, "Deploy from a branch" (`build_type=legacy`), GitHub serves Jekyll from `main` and ignores the artifact.

So the switch is two settings, and the rollback is the same two settings reversed. The Jekyll files stay on `main` until the new site is verified, so the rollback has something to build.

Commands below use `gh`. On this Mac, prefix every call with `GH_TOKEN="$(gh auth token --user llevintza)"` (never `gh auth switch`). For brevity:

```sh
export GH_TOKEN="$(gh auth token --user llevintza)"
REPO=llevintza/llevintza.github.io
```

## 1. Pre-flight checklist

Don't start until every box is ticked.

- [ ] **URL parity green.** In `web/`: `pnpm build && pnpm check:url-parity` passes (#37). Every Jekyll URL (posts at `/blog/:year/:month/:day/:slug/`, pages, `/feed.xml`, `/sitemap.xml`) exists in `web/out`.
- [ ] **Feed and sitemap exist in the export.** `ls web/out/feed.xml web/out/sitemap.xml` (#17, #29). Without them, `verify:live` fails after the switch.
- [ ] **Lighthouse budgets green** on the latest `main` (required check "Lighthouse budgets"): Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO 100.
- [ ] **All required checks green** on `main`, and the last "Deploy site" run on `main` succeeded with `deploy` skipped:
      `gh run list -R $REPO --workflow deploy.yml --branch main --limit 3`
- [ ] **Snapshot the Jekyll sitemap.** It lists every URL Jekyll serves, including post permalinks, and `verify:live --urls-from` re-checks each one after the switch. Keep it outside `$TMPDIR`, since section 5 uses it again days later:
      `curl -sf https://llevintza.github.io/sitemap.xml -o "$HOME/jekyll-sitemap-pre-cutover.xml" && grep -c '<loc>' "$HOME/jekyll-sitemap-pre-cutover.xml"`
- [ ] **Local "after" dry run.** In `web/`: `pnpm build && pnpm start` (serves `out/` on port 3000), then in another shell `pnpm verify:live --base http://localhost:3000 --urls-from "$HOME/jekyll-sitemap-pre-cutover.xml"`. All checks pass.
- [ ] **"Before" baseline.** `pnpm verify:live --urls-from "$HOME/jekyll-sitemap-pre-cutover.xml"` against the live Jekyll site passes. Keep the output to compare.
- [ ] **Pages state is what this runbook expects:**
      `gh api repos/$REPO/pages -q '{build_type,source,cname}'` → `{"build_type":"legacy","cname":null,"source":{"branch":"main","path":"/"}}`
- [ ] **The `github-pages` environment only deploys from `main`:**
      `gh api repos/$REPO/environments/github-pages/deployment-branch-policies -q '.branch_policies[].name'` → `main`
- [ ] **Optional: analytics.** If Umami should be live from day one, set the variable first (ADR 0002, #58). Leaving it unset ships the site without the script.
      `gh variable set NEXT_PUBLIC_UMAMI_WEBSITE_ID -R $REPO --body '<website id>'`
- [ ] **Quiet window.** No PR is about to merge, and you have 30 minutes to watch and roll back if needed.

## 2. Switch

1. **Switch the Pages source to GitHub Actions.** Jekyll's last deployment keeps serving until the first Actions deploy replaces it.

   ```sh
   gh api -X PUT repos/$REPO/pages -f build_type=workflow
   gh api repos/$REPO/pages -q .build_type   # → workflow
   ```

2. **Turn on the deploy job.**

   ```sh
   gh variable set PAGES_DEPLOY_ENABLED -R $REPO --body true
   ```

3. **Run the workflow on `main`.**

   ```sh
   gh workflow run deploy.yml -R $REPO --ref main
   ```

4. **Watch the run.** Both `Build static export` and `Deploy to GitHub Pages` must succeed.

   ```sh
   sleep 5
   RUN_ID=$(gh run list -R $REPO --workflow deploy.yml --event workflow_dispatch --limit 1 --json databaseId -q '.[0].databaseId')
   gh run watch "$RUN_ID" -R $REPO --exit-status
   ```

   If it fails, read `gh run view "$RUN_ID" -R $REPO --log-failed`. A failed build or deploy leaves the old Jekyll deployment serving, so a fix and re-run is usually enough. Roll back if you can't fix it within your window.

## 3. Verify

Pages' CDN caches pages for up to 10 minutes (`cache-control: max-age=600`). If a page still shows Jekyll, wait and re-run.

1. **Run the script** in `web/`:

   ```sh
   pnpm verify:live --urls-from "$HOME/jekyll-sitemap-pre-cutover.xml"
   ```

   It must end with `N/N checks passed`: 23 today, plus one per Jekyll sitemap entry beyond the four main pages and one per line added to `.github/email-icon-urls.txt`. It checks:

   | Group     | URLs                                                                                             | Pass                                   |
   | --------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
   | site      | `/`, `/blog/`, `/projects/`, `/about/`                                                           | 200, HTML                              |
   | site      | `/feed.xml`                                                                                      | 200, XML with `<feed>` or `<rss>`      |
   | site      | `/sitemap.xml`                                                                                   | 200, XML with `<urlset>`               |
   | icon      | every URL in `.github/email-icon-urls.txt`                                                       | 200, `image/*`                         |
   | project   | `/email-icons/`, `/energlens/`, `/credit-desk-analytics/`, `/instrument-price-dashboard/`        | 200, HTML (served from their own repos) |
   | sitemap   | every `<loc>` path in the saved Jekyll sitemap (posts, pages), not already listed above          | 200                                    |
   | portfolio | `https://llevintza.github.io/`                                                                   | 200, HTML                              |

2. **Confirm it's the new site, not a cached Jekyll page.** The Next.js export ships `/_next/` assets and Jekyll doesn't:

   ```sh
   curl -s https://llevintza.github.io/ | grep -c '/_next/'   # → 1 or more (0 means Jekyll)
   gh api repos/$REPO/pages -q .build_type                     # → workflow
   ```

3. **Spot-check by hand:** the home page, one old post URL, the feed in a reader, and the contact icons on the home page. Do it in a private window, signed out.
4. Post the `verify:live` output on #38 as a `[PR Author]` comment (or as Leo).

## 4. Rollback

Use this if the deploy fails and can't be fixed quickly, or if any verification check fails.

> **After the Jekyll removal PR merges, this rollback no longer works as written:** `main` has no Jekyll source left for step 2 to build. To roll back to Jekyll then, either:
>
> - revert that PR on `main` first (through a revert PR, like any other change), so the Jekyll files are back, then run the steps below; or
> - in step 2, deploy from the `jekyll-legacy` branch, which keeps the last Jekyll commit (`597d012`): `-f 'source[branch]=jekyll-legacy'` instead of `main`.
>
> A bad Next.js deploy doesn't need Jekyll: redeploy the last good build instead (ADR 0001, Rollback step 2).

```sh
# 1. Stop Actions deploys first, so a push can't redeploy the new site.
gh variable delete PAGES_DEPLOY_ENABLED -R $REPO

# 2. Restore "Deploy from a branch": main, folder /.
gh api -X PUT repos/$REPO/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'
gh api repos/$REPO/pages -q '{build_type,source}'   # → legacy, main, /

# 3. Rebuild Jekyll now instead of waiting for the next push.
gh api -X POST repos/$REPO/pages/builds
gh api repos/$REPO/pages/builds/latest -q .status   # repeat until "built"

# 4. Check the old site is back.
cd web && pnpm verify:live --urls-from "$HOME/jekyll-sitemap-pre-cutover.xml"
```

If you set `NEXT_PUBLIC_UMAMI_WEBSITE_ID` for the cutover, you can leave it: nothing reads it while the deploy job is off.

**Time to recover:** about 1 to 2 minutes for the commands and the Jekyll build, plus up to 10 minutes of CDN cache. Plan for **15 minutes** until every visitor sees Jekyll again. Project sites and email icons come from their own repos, so neither the switch nor the rollback affects them. If they fail, the cause is elsewhere: check that repo's Pages settings.

## 5. After a successful switch

- [ ] Leave it for a day or two and re-run `pnpm verify:live --urls-from "$HOME/jekyll-sitemap-pre-cutover.xml"`. Keep that snapshot until the Jekyll removal PR merges: Jekyll generates the sitemap at build time, so it can't be recovered from git.
- [x] **Follow-up PR: remove the Jekyll files** (`_config.yml`, `_data/`, `_includes/`, `_posts/`, `assets/` if unused, `Gemfile`, `index.md`, `blog.md`, `projects.md`, `about.md`). Update the README "Writing a post" and Jekyll local-preview sections for the new site (#38 acceptance), and drop Jekyll references from `AGENTS.md`. After it merges, the rollback in section 4 no longer works (there is nothing to build), so merge it only once you're confident.
- [x] **#23: weekly rebuild.** It's already in `deploy.yml` (`schedule:` Mondays 04:17 UTC) and shares the `pages` concurrency group, so it can't race a push. Before the switch it only builds. After it, confirm the next Monday run deploys: `gh run list -R $REPO --workflow deploy.yml --event schedule --limit 1`. If the cron stops after a quiet spell, re-enable it with `gh workflow enable deploy.yml -R $REPO`.
- [ ] Update ADR 0001 and #38 with the date of the switch, then close #38 and, once its other stories are done, epic #36.
