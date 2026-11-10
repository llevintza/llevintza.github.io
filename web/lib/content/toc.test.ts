import { describe, expect, it } from "vitest";

import { extractToc, shouldShowToc, type TocEntry } from "./toc";

describe("extractToc", () => {
  it("lists h2 and h3 headings in order with rehype-slug ids", async () => {
    const toc = await extractToc(
      [
        "# Title",
        "",
        "Intro.",
        "",
        "## Getting started",
        "",
        "### Install the tools",
        "",
        "## Next steps",
      ].join("\n"),
    );
    expect(toc).toEqual([
      { depth: 2, id: "getting-started", text: "Getting started" },
      { depth: 3, id: "install-the-tools", text: "Install the tools" },
      { depth: 2, id: "next-steps", text: "Next steps" },
    ]);
  });

  it("skips h1 and h4-h6 headings", async () => {
    const toc = await extractToc(
      "# One\n\n## Two\n\n#### Four\n\n##### Five\n\n###### Six",
    );
    expect(toc.map((e) => e.text)).toEqual(["Two"]);
  });

  it("gives duplicate headings the suffixed ids rehype-slug renders", async () => {
    const toc = await extractToc(
      "## Setup\n\n### Setup\n\n#### Setup\n\n## Setup",
    );
    // The h4 takes `setup-2` even though it is not listed.
    expect(toc.map((e) => e.id)).toEqual(["setup", "setup-1", "setup-3"]);
  });

  it("uses the plain text of headings with inline markup", async () => {
    const toc = await extractToc(
      "## Using `next build` with **static** [export](https://nextjs.org)",
    );
    expect(toc).toEqual([
      {
        depth: 2,
        id: "using-next-build-with-static-export",
        text: "Using next build with static export",
      },
    ]);
  });

  it("ignores headings inside code blocks", async () => {
    const toc = await extractToc(
      "## Real\n\n```md\n## Not a heading\n```\n\n## Also real",
    );
    expect(toc.map((e) => e.text)).toEqual(["Real", "Also real"]);
  });

  it("handles MDX components and returns [] without headings", async () => {
    expect(
      await extractToc('<Callout type="tip">\n\nNo headings.\n\n</Callout>'),
    ).toEqual([]);
    expect(await extractToc("Just a paragraph.")).toEqual([]);
  });
});

describe("shouldShowToc", () => {
  const entry = (n: number): TocEntry => ({
    depth: 2,
    id: `h${n}`,
    text: `H${n}`,
  });

  it("needs more than 3 headings", () => {
    expect(shouldShowToc([1, 2, 3].map(entry))).toBe(false);
    expect(shouldShowToc([1, 2, 3, 4].map(entry))).toBe(true);
  });
});
