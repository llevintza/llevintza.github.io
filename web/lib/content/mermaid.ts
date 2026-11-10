import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { Element, ElementContent, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toString } from "hast-util-to-string";
import { SKIP, visit } from "unist-util-visit";

/**
 * Build-time Mermaid diagrams.
 *
 * A fenced ```mermaid block becomes two inline SVGs, one per theme; CSS in
 * `components/mdx/mdx.css` shows the one matching `data-theme`. No Mermaid
 * code reaches the browser.
 *
 * Rendering needs headless Chromium, so the SVGs are cached in
 * `content/diagrams/<hash>-{light,dark}.svg` and committed. The hash covers
 * the diagram source, the Mermaid version, the theme config below and
 * RENDERER_VERSION, so changing any of them re-renders. A cache miss renders
 * locally via `mermaid-render.mjs`; in CI (`CI` set) it fails the build with
 * the file to commit instead. See web/README.md "Mermaid diagrams".
 */

/** Bump to invalidate every cached SVG after changing how they're produced. */
const RENDERER_VERSION = 2;

const FONT_FAMILY =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const shared = {
  startOnLoad: false,
  securityLevel: "strict",
  fontFamily: FONT_FAMILY,
  // Plain SVG <text> labels instead of <foreignObject> HTML: they scale and
  // print reliably and don't pick up page CSS. Mermaid 11 reads this from the
  // top level; the flowchart key is kept for older diagram types.
  htmlLabels: false,
  flowchart: { htmlLabels: false, curve: "basis" },
  theme: "base",
} as const;

/** Mermaid configs per theme, from the direction-B palette (spec #60). */
export const MERMAID_THEMES = {
  light: {
    ...shared,
    themeVariables: {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      darkMode: false,
      background: "#FFFFFF",
      primaryColor: "#F3F6F9",
      primaryBorderColor: "#1D6FA5",
      primaryTextColor: "#1F2A36",
      secondaryColor: "#EEF2F6",
      secondaryBorderColor: "#56677A",
      secondaryTextColor: "#1F2A36",
      tertiaryColor: "#FFFFFF",
      tertiaryBorderColor: "#DAE1E8",
      tertiaryTextColor: "#1F2A36",
      lineColor: "#56677A",
      textColor: "#1F2A36",
      mainBkg: "#F3F6F9",
      nodeBorder: "#1D6FA5",
      clusterBkg: "#EEF2F6",
      clusterBorder: "#DAE1E8",
      edgeLabelBackground: "#FFFFFF",
    },
  },
  dark: {
    ...shared,
    themeVariables: {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      darkMode: true,
      background: "#111C28",
      primaryColor: "#16232F",
      primaryBorderColor: "#3498DB",
      primaryTextColor: "#D5DEE7",
      secondaryColor: "#0F1822",
      secondaryBorderColor: "#8796A5",
      secondaryTextColor: "#D5DEE7",
      tertiaryColor: "#111C28",
      tertiaryBorderColor: "#22313F",
      tertiaryTextColor: "#D5DEE7",
      lineColor: "#8796A5",
      textColor: "#D5DEE7",
      mainBkg: "#16232F",
      nodeBorder: "#3498DB",
      clusterBkg: "#0F1822",
      clusterBorder: "#22313F",
      edgeLabelBackground: "#111C28",
    },
  },
} as const;

export type MermaidTheme = keyof typeof MERMAID_THEMES;
const THEMES = Object.keys(MERMAID_THEMES) as MermaidTheme[];

export interface MermaidOptions {
  /** Directory of the committed SVG cache. Default: `<cwd>/content/diagrams`. */
  cacheDir?: string;
  /** Fail on a cache miss instead of rendering. Default: `CI` is set. */
  ci?: boolean;
}

let mermaidVersionMemo: string | undefined;

/** Version of the Mermaid package mermaid-isomorphic renders with. */
export function mermaidVersion(): string {
  if (mermaidVersionMemo) return mermaidVersionMemo;
  // pnpm keeps mermaid next to mermaid-isomorphic in the virtual store.
  const iso = fs.realpathSync(
    path.join(process.cwd(), "node_modules", "mermaid-isomorphic"),
  );
  const pkg = JSON.parse(
    fs.readFileSync(path.join(iso, "..", "mermaid", "package.json"), "utf8"),
  ) as { version: string };
  mermaidVersionMemo = pkg.version;
  return pkg.version;
}

/** Cache key of a diagram: source + Mermaid version + theme config. */
export function diagramHash(source: string, version = mermaidVersion()) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        renderer: RENDERER_VERSION,
        mermaid: version,
        themes: MERMAID_THEMES,
        source: source.trim(),
      }),
    )
    .digest("hex")
    .slice(0, 16);
}

/** Thrown in CI when a diagram is not in the committed cache. */
export class DiagramCacheMissError extends Error {
  override name = "DiagramCacheMissError";
}

function firstLine(source: string) {
  const line = source.trim().split("\n")[0] ?? "";
  return line.length > 60 ? `${line.slice(0, 57)}...` : line;
}

function relative(file: string) {
  return path.relative(process.cwd(), file) || file;
}

/** Returns `{ light, dark }` SVG markup, from the cache or freshly rendered. */
export function loadDiagram(
  source: string,
  options: MermaidOptions = {},
): Record<MermaidTheme, string> {
  const cacheDir =
    options.cacheDir ?? path.join(process.cwd(), "content", "diagrams");
  const ci = options.ci ?? Boolean(process.env.CI);
  const hash = diagramHash(source);
  const fileFor = (theme: MermaidTheme) =>
    path.join(cacheDir, `${hash}-${theme}.svg`);

  const missing = THEMES.filter((theme) => !fs.existsSync(fileFor(theme)));
  if (missing.length > 0) {
    if (ci) {
      throw new DiagramCacheMissError(
        `Mermaid diagram "${firstLine(source)}" is not in the SVG cache: ` +
          `${missing.map((t) => relative(fileFor(t))).join(", ")} missing. ` +
          "Diagrams render in headless Chromium, which CI doesn't run: run " +
          "`pnpm build` locally in web/ and commit web/content/diagrams/.",
      );
    }
    const rendered = renderDiagrams(
      missing.map((theme) => ({
        source,
        prefix: `mermaid-${hash}-${theme}`,
        config: MERMAID_THEMES[theme],
      })),
    );
    fs.mkdirSync(cacheDir, { recursive: true });
    missing.forEach((theme, i) => {
      fs.writeFileSync(fileFor(theme), `${compactSvg(rendered[i]!.svg)}\n`);
    });
  }

  return {
    light: fs.readFileSync(fileFor("light"), "utf8"),
    dark: fs.readFileSync(fileFor("dark"), "utf8"),
  };
}

function renderDiagrams(
  jobs: { source: string; prefix: string; config: object }[],
): { svg: string }[] {
  const script = path.join(
    process.cwd(),
    "lib",
    "content",
    "mermaid-render.mjs",
  );
  try {
    const out = execFileSync(process.execPath, [script], {
      input: JSON.stringify(jobs),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(out) as { svg: string }[];
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(
      `Rendering Mermaid diagram "${firstLine(jobs[0]!.source)}" failed` +
        (stderr ? `: ${stderr}` : "") +
        ". It needs Playwright's Chromium: `pnpm exec playwright install chromium`.",
      { cause: error },
    );
  }
}

/**
 * Rounds the long decimals Mermaid writes (`427.8046875`) to 2 places. It
 * shrinks the SVG and keeps the public-content guardrail from reading digit
 * runs in coordinates as phone numbers.
 */
export function compactSvg(svg: string): string {
  return svg.replace(/\d+\.\d{3,}/g, (n) =>
    String(Number(Number(n).toFixed(2))),
  );
}

function svgNodes(svg: string): ElementContent[] {
  return fromHtml(svg, { fragment: true, space: "svg" }).children.filter(
    (node): node is ElementContent => node.type === "element",
  );
}

function isMermaidPre(node: Element): Element | undefined {
  if (node.tagName !== "pre") return undefined;
  const code = node.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code",
  );
  const classes = code?.properties.className;
  return Array.isArray(classes) && classes.includes("language-mermaid")
    ? code
    : undefined;
}

/**
 * Rehype plugin: replaces `pre > code.language-mermaid` with a figure holding
 * a light and a dark SVG. Register it before Shiki so Shiki never sees them.
 */
export function rehypeMermaid(options: MermaidOptions = {}) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      const code = isMermaidPre(node);
      if (!code || !parent || index === undefined) return;
      const svgs = loadDiagram(toString(code), options);
      const figure: Element = {
        type: "element",
        tagName: "figure",
        properties: { className: ["mdx-diagram"] },
        children: THEMES.map((theme): Element => ({
          type: "element",
          tagName: "div",
          properties: {
            className: ["mdx-diagram__svg", `mdx-diagram__svg--${theme}`],
          },
          children: svgNodes(svgs[theme]),
        })),
      };
      parent.children.splice(index, 1, figure);
      return SKIP;
    });
  };
}
