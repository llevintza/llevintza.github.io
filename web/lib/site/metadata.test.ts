import { describe, expect, it } from "vitest";

import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  buildMetadata,
  canonicalPath,
} from "./metadata";

describe("canonicalPath", () => {
  it.each([
    ["/", "/"],
    ["", "/"],
    ["/about", "/about/"],
    ["/about/", "/about/"],
    ["projects", "/projects/"],
    ["/blog/2026/11/09/post", "/blog/2026/11/09/post/"],
  ])("%j -> %j", (input, expected) => {
    expect(canonicalPath(input)).toBe(expected);
  });
});

describe("absoluteUrl", () => {
  it("is on the production origin with a trailing slash", () => {
    expect(absoluteUrl("/about")).toBe("https://llevintza.github.io/about/");
    expect(absoluteUrl("/")).toBe("https://llevintza.github.io/");
  });
});

describe("buildMetadata", () => {
  it("sets an absolute canonical with a trailing slash", () => {
    const meta = buildMetadata({ title: "About", path: "/about" });
    const canonical = meta.alternates?.canonical;
    expect(canonical).toBe(`${SITE_URL}/about/`);
    expect(new URL(String(canonical)).origin).toBe(SITE_URL);
  });

  it("uses the same URL for Open Graph", () => {
    const meta = buildMetadata({
      title: "A post",
      description: "Summary.",
      path: "/blog/2026/11/09/a-post/",
      type: "article",
    });
    expect(meta.openGraph).toMatchObject({
      title: `A post · ${SITE_NAME}`,
      description: "Summary.",
      url: `${SITE_URL}/blog/2026/11/09/a-post/`,
      siteName: SITE_NAME,
      type: "article",
    });
    expect(meta.twitter).toMatchObject({
      card: "summary",
      title: `A post · ${SITE_NAME}`,
      description: "Summary.",
    });
  });

  it("leaves the title to the layout template", () => {
    const meta = buildMetadata({ title: "Projects", path: "/projects/" });
    expect(meta.title).toBe("Projects");
  });

  it("gives the home page the bare site name and default description", () => {
    const meta = buildMetadata({ path: "/" });
    expect(meta.title).toEqual({ absolute: SITE_NAME });
    expect(meta.description).toBe(SITE_DESCRIPTION);
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/`);
    expect(meta.openGraph).toMatchObject({ title: SITE_NAME, type: "website" });
  });

  it("does not set images yet (#30 adds them)", () => {
    const meta = buildMetadata({ path: "/" });
    expect(meta.openGraph).not.toHaveProperty("images");
    expect(meta.twitter).not.toHaveProperty("images");
  });
});
