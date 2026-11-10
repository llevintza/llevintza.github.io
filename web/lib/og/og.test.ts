import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  MAX_PROMPT_LENGTH,
  MAX_SUBTITLE_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  OG_SIZE,
  loadOgFonts,
  ogImagePath,
  pageCard,
  postCard,
  promptFor,
  titleSizeFor,
  truncate,
} from "./index";

describe("ogImagePath", () => {
  it.each([
    ["/", "/og.png"],
    ["/about/", "/about/og.png"],
    ["/about", "/about/og.png"],
    ["blog/2026/11/09/a-post/", "/blog/2026/11/09/a-post/og.png"],
  ])("%j -> %j", (input, expected) => {
    expect(ogImagePath(input)).toBe(expected);
  });
});

describe("truncate", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(truncate("  Hello \n world ", 20)).toBe("Hello world");
  });

  it("cuts at a word boundary and adds an ellipsis", () => {
    const out = truncate("one two three four five six seven", 20);
    expect(out).toBe("one two three four…");
    expect(out.length).toBeLessThanOrEqual(20);
  });

  it("cuts mid-word when there is no late space", () => {
    expect(truncate("abcdefghijklmnopqrstuvwxyz", 10)).toBe("abcdefghi…");
  });
});

describe("promptFor", () => {
  it.each([
    ["/", "~"],
    ["/about/", "~/about"],
    ["/blog/", "~/blog"],
    ["/blog/2026/11/09/a-post/", "~/blog/a-post"],
    ["/projects/openswim/", "~/projects/openswim"],
  ])("%j -> %j", (input, expected) => {
    expect(promptFor(input)).toBe(expected);
  });

  it("cuts a long slug to MAX_PROMPT_LENGTH", () => {
    const out = promptFor(`/blog/2026/11/09/${"long-".repeat(20)}slug/`);
    expect(out.length).toBe(MAX_PROMPT_LENGTH);
    expect(out.startsWith("~/blog/long-")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("titleSizeFor", () => {
  it("steps down for longer titles", () => {
    expect(titleSizeFor("About")).toBeGreaterThan(titleSizeFor("x".repeat(40)));
    expect(titleSizeFor("x".repeat(40))).toBeGreaterThan(
      titleSizeFor("x".repeat(80)),
    );
  });
});

describe("pageCard", () => {
  it("builds the title, subtitle, prompt and alt", () => {
    expect(
      pageCard({ title: "About", subtitle: "Bio.", path: "/about/" }),
    ).toEqual({
      title: "About",
      subtitle: "Bio.",
      prompt: "~/about",
      alt: "About · Leo Levintza",
      titleSize: titleSizeFor("About"),
    });
  });

  it("uses the bare site name as alt for the home card", () => {
    expect(
      pageCard({ title: "Leo Levintza", subtitle: "x", path: "/" }).alt,
    ).toBe("Leo Levintza");
  });

  it("keeps long titles and subtitles within their limits", () => {
    const card = pageCard({
      title: "word ".repeat(40),
      subtitle: "word ".repeat(60),
      path: "/x/",
    });
    expect(card.title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(card.subtitle.length).toBeLessThanOrEqual(MAX_SUBTITLE_LENGTH);
    expect(card.title.endsWith("…")).toBe(true);
  });
});

describe("postCard", () => {
  const post = {
    title: "Rebuilding this site",
    date: "2026-11-09",
    tags: ["nextjs", "mdx", "typescript", "jekyll", "extra"],
    permalink: "/blog/2026/11/09/rebuilding-this-site/",
  };

  it("shows the date and up to MAX_TAGS tags", () => {
    const card = postCard(post);
    expect(card.subtitle).toBe(
      "Nov 9, 2026 · #nextjs #mdx #typescript #jekyll",
    );
    expect(card.subtitle).not.toContain("#extra");
    expect(MAX_TAGS).toBe(4);
    expect(card.prompt).toBe("~/blog/rebuilding-this-site");
    expect(card.alt).toBe("Rebuilding this site · Leo Levintza");
  });

  it("formats the date in UTC and handles no tags", () => {
    expect(postCard({ ...post, date: "2026-01-01", tags: [] }).subtitle).toBe(
      "Jan 1, 2026",
    );
  });
});

describe("fonts and size", () => {
  it("is 1200x630", () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
  });

  it("loads static TTF/OTF fonts from the repo (no woff2, no network)", () => {
    const fontDir = path.join(import.meta.dirname, "fonts");
    const fonts = loadOgFonts(fontDir);
    expect(fonts.map((f) => [f.name, f.weight])).toEqual([
      ["JetBrains Mono", 400],
      ["JetBrains Mono", 700],
      ["Departure Mono", 400],
    ]);
    for (const font of fonts) {
      const magic = Buffer.from(font.data as ArrayBuffer).subarray(0, 4);
      // TrueType (00 01 00 00) or CFF OpenType ("OTTO"), not wOF2.
      expect(["00010000", "4f54544f"]).toContain(magic.toString("hex"));
    }
    expect(fs.readdirSync(fontDir).some((f) => f.endsWith(".woff2"))).toBe(
      false,
    );
  });
});
