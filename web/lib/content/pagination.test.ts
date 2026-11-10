import { describe, expect, it } from "vitest";

import {
  extraPageNumbers,
  orPlaceholder,
  PAGE_SIZE,
  pageCount,
  pageHref,
  paginate,
  parsePageParam,
  PLACEHOLDER_PARAM,
} from "./pagination";

/** 0..n-1, standing in for posts sorted newest first. */
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("pageCount", () => {
  it("is 10 posts per page by default", () => {
    expect(PAGE_SIZE).toBe(10);
    expect(pageCount(10)).toBe(1);
    expect(pageCount(11)).toBe(2);
    expect(pageCount(25)).toBe(3);
  });

  it("gives an empty list one page", () => {
    expect(pageCount(0)).toBe(1);
  });
});

describe("pageHref", () => {
  it("puts page 1 at the base URL", () => {
    expect(pageHref("/blog/", 1)).toBe("/blog/");
    expect(pageHref("/blog/tags/mdx/", 1)).toBe("/blog/tags/mdx/");
  });

  it("puts later pages under /page/<n>/", () => {
    expect(pageHref("/blog/", 2)).toBe("/blog/page/2/");
    expect(pageHref("/blog/tags/mdx/", 3)).toBe("/blog/tags/mdx/page/3/");
  });
});

describe("paginate", () => {
  it("returns everything on page 1 with no links when it fits", () => {
    const page = paginate(range(10), 1, "/blog/");
    expect(page).toEqual({
      items: range(10),
      page: 1,
      totalPages: 1,
      prevHref: undefined,
      nextHref: undefined,
    });
  });

  it("splits 25 items into pages of 10, 10 and 5 with prev/next links", () => {
    const items = range(25);
    const [first, second, third] = [1, 2, 3].map((n) =>
      paginate(items, n, "/blog/"),
    );

    expect(first?.items).toEqual(range(10));
    expect(first?.prevHref).toBeUndefined();
    expect(first?.nextHref).toBe("/blog/page/2/");

    expect(second?.items).toEqual(range(10).map((i) => i + 10));
    expect(second?.prevHref).toBe("/blog/");
    expect(second?.nextHref).toBe("/blog/page/3/");

    expect(third?.items).toEqual([20, 21, 22, 23, 24]);
    expect(third?.prevHref).toBe("/blog/page/2/");
    expect(third?.nextHref).toBeUndefined();
    expect(third?.totalPages).toBe(3);
  });

  it("keeps the input order", () => {
    const page = paginate(["c", "b", "a"], 1, "/blog/", 2);
    expect(page?.items).toEqual(["c", "b"]);
  });

  it("has a page 1 for an empty list", () => {
    expect(paginate([], 1, "/blog/")?.items).toEqual([]);
  });

  it("returns undefined for pages that don't exist", () => {
    const items = range(11);
    expect(paginate(items, 0, "/blog/")).toBeUndefined();
    expect(paginate(items, 3, "/blog/")).toBeUndefined();
    expect(paginate(items, 1.5, "/blog/")).toBeUndefined();
    expect(paginate(items, Number.NaN, "/blog/")).toBeUndefined();
  });

  it("honours a custom page size", () => {
    expect(paginate(range(5), 3, "/x/", 2)?.items).toEqual([4]);
  });
});

describe("extraPageNumbers", () => {
  it("lists nothing while everything fits on /blog/", () => {
    expect(extraPageNumbers(0)).toEqual([]);
    expect(extraPageNumbers(10)).toEqual([]);
  });

  it("lists pages 2 and up, never page 1", () => {
    expect(extraPageNumbers(11)).toEqual([2]);
    expect(extraPageNumbers(31)).toEqual([2, 3, 4]);
  });
});

describe("parsePageParam", () => {
  it("accepts page numbers from 2", () => {
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageParam("12")).toBe(12);
  });

  it("rejects page 1, non-canonical numbers and junk", () => {
    for (const value of ["1", "0", "02", "-2", "2.0", "abc", "", "_"]) {
      expect(parsePageParam(value), value).toBeUndefined();
    }
  });
});

describe("orPlaceholder", () => {
  it("passes real params through", () => {
    expect(orPlaceholder([{ n: "2" }], { n: PLACEHOLDER_PARAM })).toEqual([
      { n: "2" },
    ]);
  });

  it("returns one placeholder instead of an empty list", () => {
    expect(orPlaceholder([], { n: PLACEHOLDER_PARAM })).toEqual([{ n: "_" }]);
  });

  it("uses a value no page number accepts", () => {
    expect(parsePageParam(PLACEHOLDER_PARAM)).toBeUndefined();
  });
});
