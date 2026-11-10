# Runbook: set up Umami analytics and Google Search Console

- **Issue:** #58. Decision: [ADR 0002](../adr/0002-analytics.md) (Umami Cloud, Hobby plan, US region, plus Google Search Console; see its "Amendment 2026-11-10").
- **Who runs it:** Leo only. It creates two accounts, sets two repo variables and redeploys the live site.
- **Workflow:** [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) ("Deploy site").
- **Expected time:** about 20 minutes.

## How the code uses the two values

Both values are public (they end up in the page source), but neither is committed. They live only in GitHub Actions **variables**, and only the deploy build on `main` reads them:

| Repo variable                          | What the build renders when it is set                                                                                                                                                   | Code                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID`         | `<script defer src="https://cloud.umami.is/script.js" data-website-id="…" data-domains="llevintza.github.io" data-do-not-track="true">` on every page, plus the analytics note on About | `web/components/analytics/`                                                      |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | `<meta name="google-site-verification" content="…">` in every page head                                                                                                                 | `siteVerification()` in `web/lib/site/metadata.ts`, used by `web/app/layout.tsx` |

When a variable is unset or empty, its tag isn't rendered. CI, Lighthouse, e2e and PR builds never get either value.

Use **variables, not secrets**: the workflow reads `vars.*`, so a value saved as a secret is ignored and the site ships without the tag.

The values are inlined at build time (`NEXT_PUBLIC_*`), so setting a variable changes nothing until the next deploy run.

Commands below use `gh`. On this Mac, prefix every call with `GH_TOKEN="$(gh auth token --user llevintza)"` (never `gh auth switch`). For brevity:

```sh
export GH_TOKEN="$(gh auth token --user llevintza)"
REPO=llevintza/llevintza.github.io
```

## 1. Umami Cloud

1. Sign up at <https://cloud.umami.is/> on the free **Hobby** plan.
2. When asked for the data region, pick **US**. It can't be changed later (ADR 0002 amendment).
3. Add the website (Settings → Websites → Add website):
   - **Name:** `llevintza.github.io` (any label works)
   - **Domain:** `llevintza.github.io` (no `https://`, no trailing slash)
4. Open the website's settings and copy its **Website ID** (a UUID). Copy only the ID, not the whole tracking-code snippet: the site builds the `<script>` tag itself.
5. Save it as a repo variable:

   ```sh
   gh variable set NEXT_PUBLIC_UMAMI_WEBSITE_ID --repo "$REPO" --body '<website-id>'
   ```

## 2. Google Search Console

The site lives on `github.io`, a domain you don't own, so a **Domain** property (DNS verification) isn't possible. Use a **URL prefix** property with the HTML tag method.

1. Open <https://search.google.com/search-console> and choose **Add property → URL prefix**.
2. Enter `https://llevintza.github.io/` (with `https://` and the trailing slash).
3. Under **Other verification methods**, choose **HTML tag**. Google shows a tag like `<meta name="google-site-verification" content="…" />`.
4. Copy only the **`content` value** (the token between the quotes), not the whole tag.
5. **Don't click Verify yet**: the tag isn't live until the deploy in step 3. Leave the tab open, or come back later; the property waits unverified.
6. Save the token as a repo variable:

   ```sh
   gh variable set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION --repo "$REPO" --body '<content-value>'
   ```

## 3. Deploy

Check both variables, then start a deploy from `main`:

```sh
gh variable list --repo "$REPO"   # both NEXT_PUBLIC_* names listed
gh workflow run deploy.yml --repo "$REPO" --ref main
gh run watch --repo "$REPO" "$(gh run list --repo "$REPO" --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

The deploy job runs only while the repo variable `PAGES_DEPLOY_ENABLED` is `true` (set at cutover, see [cutover.md](cutover.md)). If the run shows "Deploy to GitHub Pages" as skipped, the build happened but nothing was published.

When the run is green, confirm both tags are live (GitHub Pages can take a minute or two to serve the new files):

```sh
curl -s https://llevintza.github.io/ | grep -o '<meta name="google-site-verification"[^>]*>'
curl -s https://llevintza.github.io/ | grep -o '<script[^>]*cloud.umami.is[^>]*>'
```

Each command prints one tag. If one prints nothing, check that the variable is a variable (not a secret), that its name is spelled exactly as above, and that the run was on `main`.

## 4. Verify Search Console and submit the sitemap

1. Back in Search Console, click **Verify** on the HTML tag method.
2. Keep the variable set for good. Google re-checks the tag from time to time, and the property loses its verified status if the tag disappears.
3. Open **Sitemaps**, enter `sitemap.xml` (the field is prefixed with `https://llevintza.github.io/`) and click **Submit**. The status should become "Success" within a few minutes to a day.

Search data (impressions, clicks) starts to fill in after a few days.

## 5. Exclude your own visits from Umami

On each browser and device you use to visit the site:

1. Open <https://llevintza.github.io/>.
2. Open DevTools → Console and run:

   ```js
   localStorage.setItem("umami.disabled", 1);
   ```

The Umami script checks this flag and sends nothing while it is set. It only reads the flag and never writes it (ADR 0002). The flag is per browser profile and per origin, so repeat it on every browser you use, and again after clearing site data. To count your visits again: `localStorage.removeItem('umami.disabled')`.

## 6. Check that Umami counts visits

Do this before step 5, or in a browser where you haven't set the flag:

1. Open the website's **Realtime** view in Umami.
2. Visit <https://llevintza.github.io/> and click through a page or two.
3. Your visit should show within a few seconds.

If it doesn't, the visit was probably filtered rather than broken:

- **Do Not Track:** the script has `data-do-not-track="true"`, so a browser that sends DNT isn't counted.
- **Ad or DNS blockers:** `cloud.umami.is` is on common blocklists (ADR 0002). Try a browser profile without extensions, on a network without a DNS blocker.
- **Wrong host:** `data-domains="llevintza.github.io"` means only that host reports. A local `pnpm start` or a fork never counts.

Also check in DevTools → Application that the site stores no cookies and no `localStorage` entries (other than the opt-out flag if you set it).

## Undo

- **Turn Umami off:** `gh variable delete NEXT_PUBLIC_UMAMI_WEBSITE_ID --repo "$REPO"`, then redeploy (step 3). The script and the About note disappear.
- **Turn the Search Console tag off:** `gh variable delete NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION --repo "$REPO"`, then redeploy. The property becomes unverified at Google's next check; remove it in Search Console too.
