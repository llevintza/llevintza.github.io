# Visual design: Engineer's Console (issue #41)

**Decision (2026-11-09):** the owner chose **direction B, Engineer's Console**, from three mockups (see the decision comment on #41). It is the brief for the design system: #7 (tokens and theme), #8 (components), #9 (motion) and #12 (hero).

Directions A (Signature Editorial) and C (Bold Gradient) were removed after the decision; they remain in git history at `b1b9665`.

The mockup keeps these properties, which the build should keep too:

- **The email-signature identity:** blue `#3498DB` (rules, borders, focus rings, large marks) and navy `rgb(44,62,80)` / `#2C3E50` (name, headings). `#3498DB` is only 3.15:1 on white, so light themes use a derived ink blue (`#1F6FA8` / `#1D6FA5`, about 5.4:1) for small link text. Every page passed axe-core WCAG 2 A/AA, colour contrast included, in both themes (see [Verify](#verify)).
- **Themes:** follow `prefers-color-scheme`. A toggle in the header overrides it, and the choice is kept in `localStorage`.
- **Reduced motion:** every animation and transition sits inside `@media (prefers-reduced-motion: no-preference)`. With reduced motion on, content renders in its final state.
- **Real content only,** taken from `index.md`, `about.md`, `_data/featured.yml`, `_config.yml` and the public repo list. There are no posts yet, so the three post titles and the sample post are drafted from the public `aws-fastify-prometheus` README and are labelled "mockup" on the page. There is no phone number and no personal email. The private `instrument-price-dashboard` appears by name only, with no repo link.
- **Contact icons** load from `https://llevintza.github.io/email-icons/img/color/` (linkedin, github, x, zoom). The GitHub and X icons are black, so dark themes put them on a light chip.
- **Plain HTML and CSS,** plus one shared vanilla script (`mockups/_shared/site.js`: theme toggle, scroll reveal, TOC highlight). No CDN, no web fonts and no build step. Pages open straight from disk; only the contact icons need a network connection.

```
design/
  mockups/
    _shared/site.js
    b-engineers-console/   home.html  post.html  projects.html  style.css
  screenshots/b-engineers-console/<page>-<390|1440>-<light|dark>.png   (12 PNGs)
  screenshot.mjs  package.json  pnpm-lock.yaml
```

## B: Engineer's Console

![Direction B, home, 1440px, light](screenshots/b-engineers-console/home-1440-light.png)

Dark-first and developer-native: a faint 32px grid behind everything, a slow gradient mesh in the hero, a terminal panel with live project status, monospace navigation (`./blog`), `--flag` style role lines, `git log` posts, and a file-tree TOC.

| Token | Dark (primary) | Light |
|---|---|---|
| `--bg` | `#0B1118` | `#F7F9FB` |
| `--panel` | `#111C28` | `#FFFFFF` |
| `--head` | `#F2F6FA` | `#2C3E50` |
| `--ink` | `#D5DEE7` | `#1F2A36` |
| `--muted` | `#8796A5` (6.3:1) | `#56677A` (5.4:1) |
| `--link` | `#5DADE2` | `#1D6FA5` |
| `--accent` (prompts) | `#3498DB` (6.0:1) | `#1D6FA5` |
| `--grid` | `rgba(52,152,219,.07)` | `rgba(44,62,80,.06)` |
| Mesh | `#3498DB` 35%, `#2C3E50` 85% | same hues at 10 to 22% |

- **Type:** system sans for reading; `ui-monospace` (SF Mono, JetBrains Mono, Menlo) for nav, tags, meta, prompts and metrics. Minor-third scale (1.2) on 16px: 0.8125, 1, 1.2, 1.44, 1.75rem, display `clamp(2.3rem, 4.5vw + 1rem, 4rem)` at -0.03em tracking.
- **Motion:** `whoami --long` types itself out (CSS `steps()`), then the name and role lines fade in. The brand cursor blinks, the hero mesh drifts on an 18s loop, and cards fade up as they scroll in.
- **Trade-offs:** it shows clearly who the site is for (engineers, hiring managers in tech), and the terminal panel is a natural place for live data later. Monospace text is wider, which costs line length on mobile, and heavy monospace tires readers in long posts, so post bodies stay sans. The sticky blurred header and the infinite mesh animation cost some GPU. The cursor and drift loops are disabled under reduced motion.

## Verify

```sh
cd design
corepack pnpm install
corepack pnpm exec playwright install chromium   # first run only
corepack pnpm screenshots                        # all 12 PNGs
corepack pnpm a11y                               # axe checks at both widths, no PNGs
```

`screenshot.mjs` opens each page over `file://` at 390x844 and 1440x900 with `colorScheme` set to light and then dark. It scrolls the page so the scroll reveals fire, waits for finite animations to finish, and takes a full-page screenshot. It also fails on:

- horizontal overflow at either width
- uncaught JS errors
- any axe-core WCAG 2 A/AA violation

PNGs are palette-quantised with `sharp`, which keeps the 12 at under 2 MB.

`design/` is a standalone pnpm project and is not part of the site build (`web/`).
