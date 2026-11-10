// Screenshot every page of every design direction.
//   pnpm install && pnpm exec playwright install chromium   (first run only)
//   pnpm screenshots                 -> design/screenshots/<direction>/<page>-<width>-<theme>.png
//   pnpm screenshots -- --only=a     -> one direction
//   pnpm a11y                        -> axe-core checks only (no PNGs)
// Pages load over file://, so no server is needed. PNGs are palette-quantised with sharp.

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mockups = join(here, 'mockups');
const outRoot = join(here, 'screenshots');

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const a11yOnly = args.includes('--a11y-only');

const PAGES = ['home', 'post', 'projects'];
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
const THEMES = ['light', 'dark'];

const directions = (await readdir(mockups, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && /^[a-z]-/.test(d.name))
  .map((d) => d.name)
  .filter((name) => !only || name.startsWith(`${only}-`))
  .sort();

// Let animations settle: scroll through the page so scroll-reveal fires, then
// wait for every finite animation and transition to finish.
async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.6));
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
    await document.fonts.ready;
    await Promise.all(
      document.getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
    await Promise.all(Array.from(document.images).map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })));
  });
  await page.waitForTimeout(250);
}

const browser = await chromium.launch();
let shots = 0;
const problems = [];

for (const dir of directions) {
  await mkdir(join(outRoot, dir), { recursive: true });
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport, colorScheme: theme, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.on('pageerror', (err) => problems.push(`${dir}/${theme}/${viewport.width}: JS error ${err.message}`));
      for (const name of PAGES) {
        const url = pathToFileURL(join(mockups, dir, `${name}.html`)).href;
        await page.goto(url, { waitUntil: 'networkidle' });
        await settle(page);

        // Horizontal overflow is a layout bug at any width.
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 0) problems.push(`${dir}/${name}-${viewport.width}-${theme}: horizontal overflow ${overflow}px`);

        if (viewport.width === 1440 || a11yOnly) {
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
          for (const v of axe.violations) {
            problems.push(`${dir}/${name}-${viewport.width}-${theme}: axe ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
          }
        }

        if (!a11yOnly) {
          const raw = await page.screenshot({ fullPage: true, animations: 'disabled' });
          const png = await sharp(raw).png({ palette: true, quality: 85, effort: 10, compressionLevel: 9 }).toBuffer();
          await writeFile(join(outRoot, dir, `${name}-${viewport.width}-${theme}.png`), png);
          shots += 1;
        }
      }
      await context.close();
    }
  }
}

await browser.close();
console.log(`${shots} screenshots across ${directions.length} direction(s).`);
if (problems.length) {
  console.log(`\n${problems.length} issue(s):`);
  for (const p of problems) console.log(`- ${p}`);
  process.exitCode = 1;
} else {
  console.log('No overflow, JS errors or axe WCAG 2 A/AA violations.');
}
