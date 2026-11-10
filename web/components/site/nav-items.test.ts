import { describe, expect, it } from "vitest";

import { NAV_ITEMS, isActive } from "./nav-items";

describe("isActive", () => {
  it("matches a section page with or without the trailing slash", () => {
    expect(isActive("/blog/", "/blog/")).toBe(true);
    expect(isActive("/blog", "/blog/")).toBe(true);
  });

  it("matches pages below a section", () => {
    expect(isActive("/blog/2026/11/09/rebuilding-this-site/", "/blog/")).toBe(
      true,
    );
    expect(isActive("/projects/foo", "/projects/")).toBe(true);
  });

  it("does not match a different section that shares a prefix", () => {
    expect(isActive("/blogger/", "/blog/")).toBe(false);
    expect(isActive("/about-me", "/about/")).toBe(false);
  });

  it("does not match the home page or a missing pathname", () => {
    expect(isActive("/", "/blog/")).toBe(false);
    expect(isActive(null, "/blog/")).toBe(false);
  });
});

describe("NAV_ITEMS", () => {
  it("keeps the Jekyll header order with trailing-slash URLs", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/blog/",
      "/projects/",
      "/about/",
    ]);
  });
});
