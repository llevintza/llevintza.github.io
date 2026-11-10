import { evaluate } from "@mdx-js/mdx";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";

import { mdxComponents } from "./mdx-components";

async function render(mdx: string) {
  const { default: Content } = await evaluate(mdx, {
    ...runtime,
    remarkPlugins: [remarkGfm],
  });
  return renderToStaticMarkup(<Content components={mdxComponents} />);
}

describe("mdxComponents", () => {
  it("wraps tables in a labelled, focusable scroll region", async () => {
    const html = await render("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(html).toMatch(
      /^<div class="mdx-table" role="region" aria-label="Table" tabindex="0"><table>/,
    );
    expect(html).toContain("<td>2</td>");
  });

  it("renders a Callout as a note with its type as text", async () => {
    const html = await render(
      '<Callout type="warn" title="Careful">Hi</Callout>',
    );
    expect(html).toContain('class="mdx-callout mdx-callout--warn" role="note"');
    expect(html).toContain('<span class="mdx-callout__label">warning</span>');
    expect(html).toContain("Careful");
  });
});
