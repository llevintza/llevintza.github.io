import { describe, expect, it, vi } from "vitest";
import {
  PROD,
  buildChecks,
  mapLimit,
  parseIconList,
  parseSitemapPaths,
  runCheck,
} from "../verify-live.mjs";

type Check = { group: string; url: string; kind: string };
type Response = { status: number; type: string; body: string };

const ICONS = [
  "https://llevintza.github.io/email-icons/img/color/x.png",
  "https://llevintza.github.io/email-icons/img/x.png",
];

// A fetcher stub: runCheck takes the fetch function as a parameter, so no
// real network request is ever made.
const fetcher = (...responses: Response[]) => {
  const fn = vi.fn<(url: string, kind: string) => Promise<Response>>();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  return fn;
};

const html = (status = 200): Response => ({
  status,
  type: "text/html; charset=utf-8",
  body: "<!doctype html><html lang=en><body>ok</body></html>",
});

describe("parseIconList", () => {
  it("skips comments and blank lines and trims whitespace", () => {
    const text = [
      "# header comment",
      "",
      `  ${ICONS[0]}  `,
      "# Earlier set",
      ICONS[1],
      "   ",
    ].join("\n");
    expect(parseIconList(text)).toEqual(ICONS);
  });
});

describe("buildChecks", () => {
  const checks: Check[] = buildChecks("http://localhost:3000/", ICONS);

  it("puts the own-site paths under the given base, without a double slash", () => {
    const site = checks.filter((c) => c.group === "site");
    expect(site.map((c) => [c.url, c.kind])).toEqual([
      ["http://localhost:3000/", "html"],
      ["http://localhost:3000/blog/", "html"],
      ["http://localhost:3000/projects/", "html"],
      ["http://localhost:3000/about/", "html"],
      ["http://localhost:3000/feed.xml", "feed"],
      ["http://localhost:3000/sitemap.xml", "sitemap"],
    ]);
  });

  it("keeps icons, project sites and the Portfolio link on production", () => {
    const external = checks.filter((c) => c.group !== "site");
    expect(external.every((c) => c.url.startsWith(`${PROD}/`))).toBe(true);
    expect(checks.filter((c) => c.group === "icon").map((c) => c.url)).toEqual(
      ICONS,
    );
    expect(
      checks.filter((c) => c.group === "project").map((c) => c.url),
    ).toEqual([
      `${PROD}/email-icons/`,
      `${PROD}/energlens/`,
      `${PROD}/credit-desk-analytics/`,
      `${PROD}/instrument-price-dashboard/`,
    ]);
    expect(checks.filter((c) => c.group === "portfolio")).toEqual([
      { group: "portfolio", url: `${PROD}/`, kind: "html" },
    ]);
  });
});

describe("parseSitemapPaths", () => {
  it("returns de-duplicated paths with query, ignoring the host", () => {
    const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://llevintza.github.io/</loc></url>
  <url><loc> https://llevintza.github.io/blog/2026/01/02/a-post/ </loc></url>
  <url><loc>https://llevintza.github.io/search/?q=a&amp;b=c</loc></url>
  <url><loc>https://llevintza.github.io/blog/2026/01/02/a-post/</loc></url>
</urlset>`;
    expect(parseSitemapPaths(xml)).toEqual([
      "/",
      "/blog/2026/01/02/a-post/",
      "/search/?q=a&b=c",
    ]);
  });
});

describe("buildChecks with sitemap paths", () => {
  it("re-bases sitemap paths and skips ones already in the site group", () => {
    const checks: Check[] = buildChecks("http://localhost:3000", ICONS, [
      "/",
      "/blog/",
      "/blog/2026/01/02/a-post/",
    ]);
    expect(checks.filter((c) => c.group === "sitemap")).toEqual([
      {
        group: "sitemap",
        url: "http://localhost:3000/blog/2026/01/02/a-post/",
        kind: "page",
      },
    ]);
  });

  it("checks sitemap entries by status only", async () => {
    const check = { group: "sitemap", url: "http://x/a.pdf", kind: "page" };
    const pdf = { status: 200, type: "application/pdf", body: "%PDF" };
    expect((await runCheck(check, fetcher(pdf))).ok).toBe(true);
    expect((await runCheck(check, fetcher(html(404)))).ok).toBe(false);
  });
});

describe("runCheck content tests", () => {
  const check = (kind: string): Check => ({
    group: "site",
    url: "http://localhost:3000/x",
    kind,
  });

  it("passes an HTML page and fails a non-HTML body", async () => {
    expect((await runCheck(check("html"), fetcher(html()))).ok).toBe(true);
    const r = await runCheck(
      check("html"),
      fetcher({ status: 200, type: "text/plain", body: "hi" }),
    );
    expect(r).toMatchObject({ ok: false, detail: "expected HTML page" });
  });

  it("accepts an Atom or RSS feed and rejects other XML", async () => {
    const xml = (body: string) =>
      fetcher({ status: 200, type: "application/xml", body });
    expect(
      (await runCheck(check("feed"), xml('<feed xmlns="x"></feed>'))).ok,
    ).toBe(true);
    expect(
      (await runCheck(check("feed"), xml('<rss version="2.0"></rss>'))).ok,
    ).toBe(true);
    expect((await runCheck(check("feed"), xml("<urlset></urlset>"))).ok).toBe(
      false,
    );
  });

  it("accepts a sitemap only with <urlset>", async () => {
    const r = await runCheck(
      check("sitemap"),
      fetcher({ status: 200, type: "text/xml", body: "<urlset>" }),
    );
    expect(r.ok).toBe(true);
    const html404 = await runCheck(check("sitemap"), fetcher(html()));
    expect(html404.ok).toBe(false);
  });

  it("checks images by content type only", async () => {
    const png = fetcher({ status: 200, type: "image/png", body: "" });
    expect((await runCheck(check("image"), png)).ok).toBe(true);
    const page = await runCheck(check("image"), fetcher(html()));
    expect(page).toMatchObject({ ok: false, detail: "expected image" });
  });
});

describe("runCheck status and retries", () => {
  const check: Check = { group: "site", url: "http://x/", kind: "html" };

  it("fails a 404 without retrying", async () => {
    const f = fetcher(html(404), html());
    const r = await runCheck(check, f);
    expect(r).toMatchObject({ ok: false, status: 404, detail: "HTTP 404" });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 and passes on the next 200", async () => {
    const f = fetcher(html(503), html());
    const r = await runCheck(check, f);
    expect(r).toMatchObject({ ok: true, status: 200 });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("gives up after three attempts on repeated 429s", async () => {
    const f = fetcher(html(429), html(429), html(429), html());
    const r = await runCheck(check, f);
    expect(r).toMatchObject({ ok: false, status: 429 });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("reports a timeout and a network error", async () => {
    const timeout = Object.assign(new Error("t"), { name: "TimeoutError" });
    const f = vi.fn().mockRejectedValue(timeout);
    expect(await runCheck(check, f)).toMatchObject({
      ok: false,
      status: 0,
      detail: "timeout",
    });
    const refused = Object.assign(new Error("fetch failed"), {
      cause: { code: "ECONNREFUSED" },
    });
    const g = vi.fn().mockRejectedValue(refused);
    expect((await runCheck(check, g)).detail).toBe("ECONNREFUSED");
  });
});

describe("mapLimit", () => {
  it("keeps input order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapLimit([5, 1, 4, 2, 3, 0, 6], 3, async (n: number) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, n));
      inFlight--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 40, 20, 30, 0, 60]);
    expect(peak).toBe(3);
  });

  it("handles an empty list", async () => {
    expect(await mapLimit([], 6, async () => 1)).toEqual([]);
  });
});
