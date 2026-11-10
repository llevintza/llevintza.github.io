import { describe, expect, it } from "vitest";

import {
  DEFAULT_OG_IMAGE,
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
      card: "summary_large_image",
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

  it("uses the site-wide default image unless told otherwise", () => {
    const meta = buildMetadata({ title: "Tags", path: "/blog/tags/" });
    const expected = [
      {
        url: `${SITE_URL}/og.png`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
        type: "image/png",
      },
    ];
    expect(meta.openGraph?.images).toEqual(expected);
    expect(meta.twitter?.images).toEqual(expected);
    expect(DEFAULT_OG_IMAGE.path).toBe("/og.png");
  });

  it('uses the page\'s own og.png with image: "page"', () => {
    const meta = buildMetadata({
      title: "A post",
      path: "/blog/2026/11/09/a-post/",
      image: "page",
    });
    expect(meta.openGraph?.images).toEqual([
      {
        url: `${SITE_URL}/blog/2026/11/09/a-post/og.png`,
        width: 1200,
        height: 630,
        alt: `A post · ${SITE_NAME}`,
        type: "image/png",
      },
    ]);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("accepts an explicit image", () => {
    const meta = buildMetadata({
      path: "/x/",
      image: { path: "/x/custom.png", alt: "Custom" },
    });
    expect(meta.openGraph?.images).toMatchObject([
      { url: `${SITE_URL}/x/custom.png`, alt: "Custom" },
    ]);
  });
});
