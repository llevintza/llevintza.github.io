#!/usr/bin/env node
/**
 * Renders Mermaid diagrams to SVG in headless Chromium (mermaid-isomorphic +
 * Playwright). Run by `lib/content/mermaid.ts` in a child process, only when a
 * diagram is missing from the committed cache in `content/diagrams/`, so
 * Next.js never bundles Playwright and CI never needs a browser.
 *
 * stdin:  JSON `[{ source, prefix, config }]`
 * stdout: JSON `[{ svg }]`, same order. Exits 1 if any diagram fails.
 */
import { createMermaidRenderer } from "mermaid-isomorphic";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const jobs = JSON.parse(Buffer.concat(chunks).toString("utf8"));

const render = createMermaidRenderer();
const results = await Promise.all(
  jobs.map(async ({ source, prefix, config }) => {
    const [result] = await render([source], { prefix, mermaidConfig: config });
    if (result.status === "rejected") {
      throw new Error(
        `Mermaid could not render diagram ${prefix}: ${result.reason}`,
      );
    }
    return { svg: result.value.svg };
  }),
).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});

process.stdout.write(JSON.stringify(results));
