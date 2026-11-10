# ADR 0002: Privacy-friendly analytics

- **Status:** Proposed (the owner decides)
- **Date:** 2026-11-09
- **Issue:** #31 (part of epic #28, SEO, social previews and analytics)
- **Deciders:** Leo Levintza (owner)

## Context

The site is a personal blog and portfolio. It is moving from Jekyll (minima) on
GitHub Pages to a Next.js App Router site built with `output: 'export'` (static
HTML, no server), still served from GitHub Pages at `llevintza.github.io`. There
is no custom domain today, and no Cloudflare proxy in front of the site. Hosting
is being decided separately in ADR 0001.

We want rough answers to "is anyone reading this, which posts, and where do they
come from" without:

- a cookie banner (acceptance criterion of #31),
- collecting personal data or fingerprinting visitors,
- hurting the Lighthouse budget (Performance >= 95),
- adding a server or a recurring bill that a low-traffic personal site doesn't
  justify.

Expected traffic is low: well under 10k pageviews per month for the foreseeable
future.

## Decision drivers

1. **No cookie banner.** The tool must store nothing on the visitor's device
   (no cookies, no `localStorage` writes, no identifiers), so ePrivacy
   Art. 5(3) consent isn't triggered. It also must not process personal data in
   a way that needs consent under GDPR. The only device read allowed is the
   vendor's own opt-out flag: Umami reads `localStorage["umami.disabled"]` and
   Plausible reads `localStorage.plausible_ignore` (checked in each live script
   on 2026-11-09). Each script only checks for its flag and never sets it. It
   lets the site owner exclude their own visits, and a normal visitor never has
   it set.
2. **Cost.** Free or close to free at our volume.
3. **Works on static GitHub Pages.** No server-side code, no rewrites, no
   required custom domain or proxy.
4. **Performance.** Small, async, non-blocking script that doesn't threaten
   Performance >= 95.
5. **Data location.** EU storage is preferred.
6. **Low effort and low ops.** A one-line integration in the root layout and
   nothing to patch or back up.
7. **Accuracy.** How much traffic ad blockers hide, and whether data is sampled.

## Options considered

1. **None.** Ship no analytics.
2. **Cloudflare Web Analytics**, using the manual JS beacon (the site isn't
   proxied).
3. **Plausible (hosted)**, the paid SaaS at plausible.io.
4. **Plausible Community Edition (self-hosted)**.
5. **Umami Cloud**, the hosted SaaS at cloud.umami.is.
6. **Umami (self-hosted)**.

## Findings per option

All prices and facts were checked on **2026-11-09** against the sources listed
under [References](#references). Script sizes were measured on the same date by
downloading each tracker script with `curl` and recording both the gzip
transfer size and the uncompressed size.

### 1. None

- **Cost:** $0.
- **Cookie-less:** Yes. Nothing runs.
- **Data location:** N/A.
- **Performance:** Zero impact.
- **GitHub Pages:** N/A.
- **Ad-blocker resilience:** N/A.
- **Effort:** None.
- **Downside:** No feedback on what readers value. Google Search Console (free,
  no script) still gives search impressions and clicks, but no referrers, no
  non-search traffic, and no per-page reads.

### 2. Cloudflare Web Analytics

- **Cost now:** Free. Headline: "Privacy-first, lightweight, accurate web
  analytics—for free." [CF-home]
- **Cookie-less:** Yes. It "does not use any client-side state, such as cookies
  or localStorage, to collect usage metrics." [CF-home]
- **Data location:** Cloudflare, Inc. (US company), on its global network. The
  docs offer no EU-only storage option for Web Analytics. [CF-faq]
- **Script size:** `static.cloudflareinsights.com/beacon.min.js` is
  **10.3 KB gzip / 31.9 KB raw** (measured). It loads with `defer`, so it
  doesn't block render. It's the largest of the options, but still small next
  to a 95 budget.
- **GitHub Pages:** Works without a proxy or custom domain via the manual
  snippet, which "connects to cloudflareinsights.com". Automatic injection
  requires the site to be proxied through Cloudflare. [CF-faq] Free limit: 10
  non-proxied sites per account. [CF-limits]
- **Ad-blocker resilience:** Poor. Cloudflare's own FAQ says the beacon "is
  blocked by ad-blockers (including adblockplus, Brave, DuckDuckGo extension,
  etc)". Unblockable edge analytics exist only for proxied sites on paid
  plans. [CF-faq] On the machine used to write this ADR, a DNS-level blocklist
  resolved `static.cloudflareinsights.com` to `0.0.0.0`.
- **Accuracy:** Unsampled data is kept for 7 days, then "aggregated down to
  around 10%". Queries are dynamically sampled, and the dashboard shows the
  previous six months. [CF-faq] There are no custom events or goals.
- **Effort (Next.js static export):** Trivial. One `<script defer>` tag with a
  public site token in the root layout. The beacon tracks SPA route changes.

### 3. Plausible (hosted)

- **Cost now:** **Starter $9/month** (1 site, up to 10k monthly pageviews, no
  retention limit). Growth is $14/month and Business is $19/month. Annual
  billing gives "2 months free". There is a 30-day free trial, no credit card
  needed, and **no free tier**. [PL-pricing]
- **Cookie-less:** Yes. "We don't use cookies or generate persistent visitor
  identifiers." [PL-data]
- **Data location:** EU. Servers are in "Falkenstein, Germany, owned by Hetzner,
  a European company", the CDN is Bunny (Slovenia), and the company is
  incorporated in Estonia. [PL-privacy]
- **Script size:** `plausible.io/js/script.js` is **1.3 KB gzip / 2.8 KB raw**
  (measured). Plausible says its script is "2.5KB gzipped" for the current
  full-featured script. [PL-privacy] This is the smallest option.
- **GitHub Pages:** Works with no proxy or custom domain. You register the
  `llevintza.github.io` domain in the dashboard.
- **Ad-blocker resilience:** Medium. "Plausible is blocked far less than Google
  Analytics. Firefox and Safari do not block it by default". Expected loss
  without a proxy is "typically between 5% and 25%". [PL-proxy] The documented
  fix is a first-party proxy, using a Cloudflare Worker or server rewrites.
  GitHub Pages can't do rewrites, so the fix would need a Worker plus a custom
  domain. `plausible.io` wasn't on the DNS blocklist that blocked the other two
  hosted options.
- **Effort (Next.js static export):** Trivial. One `<script defer>` tag. It
  tracks `pushState` navigation, and custom events go through `window.plausible`.

### 4. Plausible Community Edition (self-hosted)

- **Cost now:** Software is free under "AGPLv3 or any later version". You pay
  for the server, CDN and backups. [PL-self] (VPS cost isn't priced here.)
- **Cookie-less / script:** Same as hosted.
- **Data location:** Wherever you host it.
- **Requirements:** ClickHouse plus PostgreSQL. The CPU needs SSE 4.2 or NEON,
  and "At least 2 GB of RAM is recommended". [PL-ce] Releases come about
  "twice per year", without funnels or some other features of the hosted
  version. [PL-self]
- **GitHub Pages:** The site stays static, but you need a separate always-on
  server with its own domain and TLS. Pointing it at a first-party subdomain
  (for ad-blocker resilience) needs a custom domain.
- **Ad-blocker resilience:** Better than hosted if served from your own
  subdomain, because generic blocklists don't know it.
- **Effort:** High for this project: provisioning, upgrades, backups, ClickHouse
  memory tuning, and monitoring. Out of proportion for a personal site.

### 5. Umami Cloud

- **Cost now:** **Hobby $0/month**: "Up to 100K events per month", "1 website",
  "6 month data retention", community support. Pro is $20/month (1M events, up
  to 20 websites, 2-year retention). [UM-pricing]
- **Cookie-less:** Yes. The pricing page lists "No cookie banners required" on
  every plan, and Umami "does not collect personal data, and does not track
  users across websites". [UM-pricing]
- **Data location:** You choose a **US or EU data region** at account setup. It
  is read-only afterwards. Umami notes that the region "applies to analytics
  storage", and that CDN, security, support and logging may involve services
  outside it. [UM-faq]
- **Script size:** `cloud.umami.is/script.js` is **4.1 KB gzip / 9.2 KB raw**
  (measured). Loaded with `defer`, its effect on Lighthouse is negligible.
- **GitHub Pages:** Works with no proxy or custom domain.
- **Ad-blocker resilience:** Medium-low. The Cloud script host is on common
  blocklists: the DNS blocklist on the authoring machine resolved `umami.is`
  and `cloud.umami.is` to `0.0.0.0`. The usual workaround is to serve the
  script and the collect endpoint first-party, with a renamed script and a
  custom host URL. That needs a proxy (a Cloudflare Worker) and, realistically,
  a custom domain.
- **Effort (Next.js static export):** Trivial. One `<script defer>` tag with
  `data-website-id`. It auto-tracks history-API navigation, and custom events go
  through `data-umami-event` attributes or `umami.track()`.
- **Risk:** It's a free tier, so the limits can change. The 100K-event cap is
  about 10x our expected volume.

### 6. Umami (self-hosted)

- **Cost now:** Software is free (MIT). You pay for hosting. Requirements are
  "Node.js version 18.18+" and "PostgreSQL database version v12.14+".
  [UM-readme]
- **Cookie-less / script / effort to embed:** Same as Cloud.
- **Data location:** Wherever you host it.
- **GitHub Pages:** As with Plausible CE, it needs a separate always-on server
  (or a serverless deployment plus a managed Postgres) and its own domain.
- **Ad-blocker resilience:** Good if served from your own subdomain with a
  renamed script.
- **Effort:** Medium to high. It's lighter than Plausible CE (no ClickHouse), but
  it's still a database and an app to run, patch and back up.

## Comparison

| | None | Cloudflare WA | Plausible hosted | Plausible CE | Umami Cloud | Umami self-host |
|---|---|---|---|---|---|---|
| Cost now (2026-11-09) | $0 | $0 | $9/mo (no free tier) | $0 + server | **$0** (Hobby, 100K events) | $0 + server + DB |
| No cookies / no banner | Yes | Yes | Yes | Yes | Yes | Yes |
| Data location | N/A | Cloudflare global (US co.) | EU (DE, Hetzner) | Self-chosen | **EU region selectable** | Self-chosen |
| Script (gzip / raw) | 0 | 10.3 / 31.9 KB | **1.3 / 2.8 KB** measured (`js/script.js`); vendor states 2.5 KB gzip | same as hosted | 4.1 / 9.2 KB | 4.1 / 9.2 KB |
| Lighthouse >= 95 risk | None | Low | Very low | Very low | Very low | Very low |
| Static GitHub Pages, no proxy | N/A | Yes (manual snippet) | Yes | Needs server | Yes | Needs server |
| Needs custom domain / CF proxy | No | No (proxy only for auto-inject) | No | Server domain | No | Server domain |
| Ad-blocker resilience | N/A | Poor (vendor-confirmed) | Medium (5-25% loss) | Good (1st-party) | Medium-low | Good (1st-party) |
| Sampling / retention | N/A | Sampled; ~10% after 7 days; 6-mo view | Unsampled; no limit | Unsampled | Unsampled; 6 months | Unsampled |
| Custom events | N/A | No | Yes | Yes | Yes | Yes |
| Next.js export effort | None | Trivial | Trivial | High (ops) | Trivial | Medium-high (ops) |
| Ongoing ops | None | None | None | High | None | Medium |

## Recommendation

**Adopt Umami Cloud on the free Hobby plan, created in the EU data region,
loaded only in production builds.**

Why:

- It's the only option that is **free, cookie-less, EU-stored and unsampled**
  at once. Cloudflare is free but US-run and samples after 7 days. Plausible is
  EU and unsampled but costs $9/month.
- The 4.1 KB deferred script is no threat to Performance >= 95.
- It works on plain GitHub Pages with no proxy or custom domain, so it doesn't
  depend on the outcome of ADR 0001.
- It supports custom events (for example, outbound clicks on featured projects)
  if we want them later.
- If it outgrows Hobby or the terms change, switching to self-hosted Umami
  keeps the same script and API, and switching to Plausible is a one-tag change.

**Runner-up: Plausible hosted ($9/month)** if the owner prefers to pay for a
smaller script, better default ad-blocker resilience, unlimited retention, and
a vendor with no free tier to change. **Fallback: Cloudflare Web Analytics** if
the hosting ADR moves the site behind Cloudflare. Then automatic injection
needs no code, but sampling and US data handling still apply.

Not recommended: self-hosting either tool (ops burden out of proportion) and
"none" (the epic explicitly wants traffic insight).

## Integration sketch (recommended option)

Text only. No code changes are made in this ADR.

1. The owner creates a Umami Cloud account, picks **EU** as the data region (it
   can't be changed later), and adds the website `llevintza.github.io`. Umami
   shows a website ID. It is a public identifier that ends up in page source,
   not a secret.
2. Store the ID as a GitHub Actions **variable** (not a secret, and not
   committed), e.g. `NEXT_PUBLIC_UMAMI_WEBSITE_ID`. Pass it **only** to the
   build step of the Pages deploy job, not to CI or preview builds.
3. In `web/app/layout.tsx`, render the script only when
   `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set. That is the main guard: CI and
   preview builds don't have the variable, so they render no script. Also keep
   a `NODE_ENV === 'production'` check, which only silences `next dev`, because
   `next build` always runs with `NODE_ENV=production`. `data-domains` (below)
   is the backstop. Use `next/script` with `strategy="afterInteractive"`, or a plain
   `<script defer>`, pointing at `https://cloud.umami.is/script.js` with:
   - `data-website-id` set from the variable,
   - `data-domains="llevintza.github.io"` so forks and previews don't report,
   - optionally `data-do-not-track="true"` to honour DNT.
   Umami follows App Router client navigations through the history API, so no
   route-change hook is needed.
4. If a Content-Security-Policy is added later, allow `https://cloud.umami.is`
   in `script-src` and `connect-src`.
5. Optional: tag outbound links on the Projects page with `data-umami-event`
   attributes to count clicks per project.
6. Add one sentence to the About or a Privacy page: "This site uses Umami, a
   cookie-less analytics tool. It stores no cookies and collects no personal
   data. Aggregate stats are stored in the EU."
7. Verify by running Lighthouse on the production build (Performance >= 95,
   no new console errors), checking that the browser stores no cookies or
   `localStorage` for the origin (DevTools → Application: the script reads
   only `umami.disabled` and writes nothing), and checking that a visit shows in the Umami
   realtime view.

## Consequences

- **Positive:** Basic readership insight at $0 with no cookie banner, EU
  storage, a negligible performance cost, and no infrastructure.
- **Negative:**
  - Visitors with ad or DNS blockers aren't counted. Numbers are a lower
    bound, likely missing a noticeable share of a technical audience.
  - Hobby retention is only 6 months, so long-term trends need periodic export
    or an upgrade.
  - It depends on a free tier whose limits may change.
  - "No cookie banner" rests on the tool storing nothing on the device and
    collecting no personal data. The one exception is a read of the vendor's
    opt-out flag (`umami.disabled` in `localStorage`), which the script checks
    but never writes. This matches the vendor's statements and
    common regulator guidance for audience measurement, but it isn't legal
    advice. The site should still mention analytics in a short privacy note.
- **Revisit when:** traffic nears 100K events per month, the owner wants
  retention beyond 6 months, ADR 0001 puts the site behind Cloudflare or a
  custom domain (making a first-party proxy cheap), or Umami changes the
  Hobby terms.

## References

All accessed 2026-11-09.

- [CF-home] Cloudflare Web Analytics product page: <https://www.cloudflare.com/web-analytics/>
- [CF-faq] Cloudflare Web Analytics FAQ (page last updated 2026-07-14): <https://developers.cloudflare.com/web-analytics/faq/>
- [CF-limits] Cloudflare Web Analytics limits (page last updated 2026-08-12): <https://developers.cloudflare.com/web-analytics/limits/>
- [PL-pricing] Plausible pricing: <https://plausible.io/#pricing>
- [PL-data] Plausible data policy: <https://plausible.io/data-policy>
- [PL-privacy] Plausible privacy-focused analytics: <https://plausible.io/privacy-focused-web-analytics>
- [PL-proxy] Plausible proxy introduction: <https://plausible.io/docs/proxy/introduction>
- [PL-self] Plausible self-hosted: <https://plausible.io/self-hosted-web-analytics>
- [PL-ce] Plausible Community Edition README: <https://github.com/plausible/community-edition>
- [UM-pricing] Umami pricing: <https://umami.is/pricing>
- [UM-faq] Umami Cloud FAQ (data regions): <https://docs.umami.is/docs/cloud/faq>
- [UM-readme] Umami README (requirements): <https://github.com/umami-software/umami>
- Script sizes measured with `curl -sL -H 'Accept-Encoding: gzip' -w '%{size_download}'`
  (gzip) and without the header (raw) against `static.cloudflareinsights.com/beacon.min.js`,
  `plausible.io/js/script.js` and `cloud.umami.is/script.js`.
