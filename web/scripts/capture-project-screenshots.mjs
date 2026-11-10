#!/usr/bin/env node
/**
 * Captures each case study's live site and writes optimised screenshots to
 * public/images/projects/<slug>/ (issue #24). Run at authoring time, not in CI:
 *
 *   pnpm screenshots:projects              # every case study with a liveUrl
 *   pnpm screenshots:projects energlens    # just these slugs
 *
 * For each `screenshots[]` entry in content/projects/<slug>.mdx it loads
 * `url` (default: the project's `liveUrl`) in Chromium at 1280x800 and
 * device scale 2, then writes `<file>-{640,1280}.{avif,webp,png}`. The PNG is
 * palette-quantised and is the `<img>` fallback; the page reads its size from
 * the 1280 PNG. Commit the outputs.
 */
import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import sharp from "sharp";
import { parse as parseYaml } from "yaml";

const WEB_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const CONTENT_DIR = path.join(WEB_DIR, "content", "projects");
const OUT_ROOT = path.join(WEB_DIR, "public", "images", "projects");

export const VIEWPORT = { width: 1280, height: 800 };
export const WIDTHS = [640, 1280];

function readCaseStudies() {
  return readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => {
      const source = readFileSync(path.join(CONTENT_DIR, name), "utf8");
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
      if (!match) throw new Error(`${name}: missing frontmatter`);
      return parseYaml(match[1]);
    });
}

async function capture(browser, url) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  try {
    // Free-tier backends can cold-start; give them time, then let the SPA settle.
    await page.goto(url, { waitUntil: "load", timeout: 90_000 });
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
    return await page.screenshot({ type: "png" });
  } finally {
    await context.close();
  }
}

async function writeVariants(raw, outDir, file) {
  const written = [];
  for (const width of WIDTHS) {
    const base = sharp(raw).resize({ width });
    const outputs = [
      [`${file}-${width}.avif`, base.clone().avif({ quality: 50, effort: 6 })],
      [`${file}-${width}.webp`, base.clone().webp({ quality: 72 })],
      [
        `${file}-${width}.png`,
        base.clone().png({ palette: true, quality: 80, effort: 10 }),
      ],
    ];
    for (const [name, pipeline] of outputs) {
      const target = path.join(outDir, name);
      await pipeline.toFile(target);
      written.push(`${name} ${(statSync(target).size / 1024).toFixed(0)} KB`);
    }
  }
  return written;
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const studies = readCaseStudies().filter(
    (s) =>
      (only.size === 0 || only.has(s.slug)) &&
      Array.isArray(s.screenshots) &&
      s.screenshots.length > 0,
  );
  if (studies.length === 0) {
    console.log("No case studies with screenshots to capture.");
    return;
  }

  const browser = await chromium.launch();
  try {
    for (const study of studies) {
      const outDir = path.join(OUT_ROOT, study.slug);
      mkdirSync(outDir, { recursive: true });
      for (const shot of study.screenshots) {
        const url = shot.url ?? study.liveUrl;
        if (!url)
          throw new Error(`${study.slug}: no url or liveUrl to capture`);
        console.log(`${study.slug}/${shot.file} <- ${url}`);
        const raw = await capture(browser, url);
        for (const line of await writeVariants(raw, outDir, shot.file)) {
          console.log(`  ${line}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
}

await main();
