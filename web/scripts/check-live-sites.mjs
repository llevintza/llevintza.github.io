// Checks every featured project's liveUrl: GET with redirects followed and a
// 10s timeout; exits 1 if any site errors or answers with a non-2xx status.
// Usage: pnpm check:live-sites   (Node 22+, uses built-in TypeScript stripping)
import { featuredProjects } from "../content/featured.ts";

const TIMEOUT_MS = 10_000;

const sites = featuredProjects
  .filter((p) => p.liveUrl)
  .map((p) => ({ name: p.name, url: p.liveUrl }));

const results = await Promise.all(
  sites.map(async ({ name, url }) => {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      await res.body?.cancel();
      return { name, url, ok: res.ok, detail: String(res.status) };
    } catch (err) {
      const detail =
        err?.name === "TimeoutError"
          ? "timeout"
          : String(err?.cause?.code ?? err?.message ?? err);
      return { name, url, ok: false, detail };
    }
  }),
);

for (const r of results) {
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.detail.padEnd(7)}  ${r.name}  ${r.url}`,
  );
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} live sites OK`,
);
if (failed.length > 0) process.exit(1);
