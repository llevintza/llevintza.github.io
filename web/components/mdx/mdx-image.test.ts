import { describe, expect, it } from "vitest";

import { localImageSize } from "./mdx-image";

describe("localImageSize", () => {
  it("reads the intrinsic size of an image under web/public", () => {
    expect(
      localImageSize(
        "/images/posts/rebuilding-this-site/static-export.svg?v=1#top",
      ),
    ).toEqual({ width: 1200, height: 640 });
  });

  it("returns undefined for remote and protocol-relative URLs", () => {
    expect(localImageSize("https://example.com/a.png")).toBeUndefined();
    expect(localImageSize("//example.com/a.png")).toBeUndefined();
  });

  it("refuses paths that escape web/public", () => {
    expect(localImageSize("/../package.json")).toBeUndefined();
    expect(localImageSize("/images/../../package.json")).toBeUndefined();
  });

  it("returns undefined for a missing file or a bad escape", () => {
    expect(localImageSize("/images/missing.png")).toBeUndefined();
    expect(localImageSize("/images/100%.png")).toBeUndefined();
  });
});
