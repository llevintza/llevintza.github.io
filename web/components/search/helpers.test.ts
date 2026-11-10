import { describe, expect, it } from "vitest";

import {
  dateFromUrl,
  decodeEntities,
  isApplePlatform,
  isPaletteShortcut,
  isSlashShortcut,
  isTypingTarget,
  moveActive,
  parseExcerpt,
  resultKind,
} from "./helpers";

const key = (k: string, mods: Partial<Record<string, boolean>> = {}) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("isApplePlatform", () => {
  it.each([
    ["MacIntel", true],
    ["macOS", true],
    ["iPhone", true],
    ["Win32", false],
    ["Linux x86_64", false],
    [undefined, false],
  ])("%s -> %s", (platform, expected) => {
    expect(isApplePlatform(platform)).toBe(expected);
  });
});

describe("isPaletteShortcut", () => {
  it("accepts Cmd+K and Ctrl+K", () => {
    expect(isPaletteShortcut(key("k", { metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(key("K", { metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(key("k", { ctrlKey: true }))).toBe(true);
  });

  it("ignores other keys and extra modifiers", () => {
    expect(isPaletteShortcut(key("j", { ctrlKey: true }))).toBe(false);
    expect(isPaletteShortcut(key("k"))).toBe(false);
    expect(isPaletteShortcut(key("k", { ctrlKey: true, shiftKey: true }))).toBe(
      false,
    );
    expect(isPaletteShortcut(key("k", { metaKey: true, altKey: true }))).toBe(
      false,
    );
  });
});

describe("isSlashShortcut", () => {
  it("accepts a bare slash only", () => {
    expect(isSlashShortcut(key("/"))).toBe(true);
    expect(isSlashShortcut(key("/", { ctrlKey: true }))).toBe(false);
    expect(isSlashShortcut(key("?", { shiftKey: true }))).toBe(false);
  });
});

describe("isTypingTarget", () => {
  it.each([
    [{ tagName: "INPUT", type: "text" }, true],
    [{ tagName: "input", type: "search" }, true],
    [{ tagName: "INPUT" }, true],
    [{ tagName: "INPUT", type: "checkbox" }, false],
    [{ tagName: "TEXTAREA" }, true],
    [{ tagName: "SELECT" }, true],
    [{ tagName: "DIV", isContentEditable: true }, true],
    [{ tagName: "A" }, false],
    [{ tagName: "BODY" }, false],
    [null, false],
  ])("%j -> %s", (target, expected) => {
    expect(isTypingTarget(target)).toBe(expected);
  });
});

describe("moveActive", () => {
  it("starts at the first or last result", () => {
    expect(moveActive(-1, 1, 3)).toBe(0);
    expect(moveActive(-1, -1, 3)).toBe(2);
  });

  it("wraps around", () => {
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(0, -1, 3)).toBe(2);
    expect(moveActive(1, 1, 3)).toBe(2);
  });

  it("returns -1 when there are no results", () => {
    expect(moveActive(0, 1, 0)).toBe(-1);
  });
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(
      decodeEntities("a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#x27;"),
    ).toBe(`a & b <c> "d" 'e'`);
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("&bogus; &#0;")).toBe("&bogus; &#0;");
  });
});

describe("parseExcerpt", () => {
  it("splits matches from plain text", () => {
    expect(
      parseExcerpt(
        "Rebuilding <mark>this</mark> site with <mark>Next.js</mark>.",
      ),
    ).toEqual([
      { text: "Rebuilding ", match: false },
      { text: "this", match: true },
      { text: " site with ", match: false },
      { text: "Next.js", match: true },
      { text: ".", match: false },
    ]);
  });

  it("decodes entities so escaped markup stays text", () => {
    expect(parseExcerpt("&lt;script&gt; <mark>a&amp;b</mark>")).toEqual([
      { text: "<script> ", match: false },
      { text: "a&b", match: true },
    ]);
  });

  it("drops any other tag and merges adjacent runs", () => {
    expect(
      parseExcerpt(
        "<b>bold</b> <mark>x</mark><mark>y</mark><img src=x onerror=alert(1)>",
      ),
    ).toEqual([
      { text: "bold ", match: false },
      { text: "xy", match: true },
    ]);
  });

  it("handles an empty excerpt", () => {
    expect(parseExcerpt("")).toEqual([]);
  });
});

describe("dateFromUrl and resultKind", () => {
  it("reads the date from a post permalink", () => {
    expect(dateFromUrl("/blog/2026/11/09/rebuilding-this-site/")).toBe(
      "2026-11-09",
    );
    expect(resultKind("/blog/2026/11/09/rebuilding-this-site/")).toBe("post");
  });

  it("labels projects and other pages", () => {
    expect(dateFromUrl("/projects/")).toBeNull();
    expect(resultKind("/projects/")).toBe("project");
    expect(resultKind("/projects/energlens/")).toBe("project");
    expect(resultKind("/about/")).toBe("page");
  });
});
