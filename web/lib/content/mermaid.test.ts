import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { evaluate } from "@mdx-js/mdx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  compactSvg,
  DiagramCacheMissError,
  diagramHash,
  loadDiagram,
  mermaidVersion,
  rehypeMermaid,
} from "./mermaid";

const SOURCE = "flowchart LR\n  A --> B";
const svg = (theme: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" id="m-${theme}" viewBox="0 0 10 10"><text>${theme}</text></svg>`;

let cacheDir: string;

beforeEach(() => {
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "mermaid-cache-"));
});
afterEach(() => {
  fs.rmSync(cacheDir, { recursive: true, force: true });
});

function seed(source: string) {
  const hash = diagramHash(source);
  for (const theme of ["light", "dark"]) {
    fs.writeFileSync(path.join(cacheDir, `${hash}-${theme}.svg`), svg(theme));
  }
}

describe("diagramHash", () => {
  it("ignores surrounding whitespace but not content or version", () => {
    expect(diagramHash(SOURCE, "11.0.0")).toBe(
      diagramHash(`\n${SOURCE}\n\n`, "11.0.0"),
    );
    expect(diagramHash(SOURCE, "11.0.0")).not.toBe(
      diagramHash(`${SOURCE}\n  B --> C`, "11.0.0"),
    );
    expect(diagramHash(SOURCE, "11.0.0")).not.toBe(
      diagramHash(SOURCE, "11.0.1"),
    );
  });
});

describe("loadDiagram", () => {
  it("reads both themes from the cache", () => {
    seed(SOURCE);
    expect(loadDiagram(SOURCE, { cacheDir, ci: true })).toEqual({
      light: svg("light"),
      dark: svg("dark"),
    });
  });

  it("fails in CI on a miss, naming the diagram and the files to commit", () => {
    expect(() => loadDiagram(SOURCE, { cacheDir, ci: true })).toThrow(
      DiagramCacheMissError,
    );
    expect(() => loadDiagram(SOURCE, { cacheDir, ci: true })).toThrow(
      new RegExp(
        `"flowchart LR".*${diagramHash(SOURCE)}-light\\.svg.*pnpm build.*web/content/diagrams/`,
      ),
    );
  });
});

describe("rehypeMermaid in MDX", () => {
  it("replaces mermaid fences with light and dark SVGs, leaving other code", async () => {
    seed(SOURCE);
    const { default: Content } = await evaluate(
      `\`\`\`mermaid\n${SOURCE}\n\`\`\`\n\n\`\`\`js\nconst a = 1;\n\`\`\``,
      { ...runtime, rehypePlugins: [[rehypeMermaid, { cacheDir, ci: true }]] },
    );
    const html = renderToStaticMarkup(createElement(Content));
    expect(html).toContain('<figure class="mdx-diagram">');
    expect(html).toContain(
      '<div class="mdx-diagram__svg mdx-diagram__svg--light"><svg',
    );
    expect(html).toContain('id="m-dark"');
    expect(html).not.toContain("language-mermaid");
    expect(html).toContain('class="language-js"');
  });
});

describe("compactSvg", () => {
  it("rounds long decimals to 2 places and leaves the rest alone", () => {
    expect(
      compactSvg('<path d="M427.8046875,10L771.8203125,0.5"/><g id="a1.2">'),
    ).toBe('<path d="M427.8,10L771.82,0.5"/><g id="a1.2">');
  });
});

describe("mermaidVersion", () => {
  it("matches the mermaid pinned in package.json, so bumps are deliberate", async () => {
    const pkg = (await import("../../package.json")).default as {
      devDependencies: Record<string, string>;
    };
    expect(mermaidVersion()).toBe(pkg.devDependencies.mermaid);
  });
});
