import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { featuredProjects, type FeaturedProject } from "@/content/featured";

import { ContentError } from "@/lib/content/frontmatter";
import {
  getAllCaseStudies,
  parseCaseStudy,
  readPngSize,
  SCREENSHOT_FORMATS,
  SCREENSHOT_WIDTHS,
} from "./case-studies";

const featured: FeaturedProject[] = [
  {
    name: "pub-app",
    access: "public",
    repoUrl: "https://github.com/llevintza/pub-app",
    description: "A public project.",
    stack: ["TypeScript"],
  },
  {
    name: "priv-app",
    access: "private",
    description: "A private project.",
    stack: ["Go"],
  },
];

/** A PNG header with just the IHDR fields `readPngSize` reads. */
function pngHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

let publicDir: string;

beforeAll(() => {
  publicDir = fs.mkdtempSync(path.join(os.tmpdir(), "case-studies-"));
  const dir = path.join(publicDir, "images", "projects", "pub-app");
  fs.mkdirSync(dir, { recursive: true });
  for (const width of SCREENSHOT_WIDTHS) {
    for (const format of SCREENSHOT_FORMATS) {
      fs.writeFileSync(
        path.join(dir, `home-${width}.${format}`),
        pngHeader(width, (width * 5) / 8),
      );
    }
  }
});

afterAll(() => {
  fs.rmSync(publicDir, { recursive: true, force: true });
});

const BODY = "## Problem\n\nIt was hard.\n\n## Approach\n\nWe fixed it.\n";

function source(frontmatter: string, body = BODY) {
  return `---\n${frontmatter}\n---\n\n${body}`;
}

const validPublic = [
  "title: Pub App",
  "slug: pub-app",
  "summary: Does things.",
  "stack: [TypeScript, Node]",
  "liveUrl: https://example.org/pub-app/",
  "repo: https://github.com/llevintza/pub-app",
  "screenshots:",
  "  - file: home",
  "    alt: The home page.",
].join("\n");

const validPrivate = [
  "title: Priv App",
  "slug: priv-app",
  "summary: Does private things.",
  "stack: [Go]",
].join("\n");

function parse(file: string, src: string) {
  return parseCaseStudy(file, src, { featured, publicDir });
}

describe("parseCaseStudy", () => {
  it("parses a public case study with screenshots", () => {
    const study = parse("content/projects/pub-app.mdx", source(validPublic));
    expect(study).toMatchObject({
      title: "Pub App",
      slug: "pub-app",
      access: "public",
      repo: "https://github.com/llevintza/pub-app",
      permalink: "/projects/pub-app/",
      stack: ["TypeScript", "Node"],
    });
    expect(study.screenshots).toEqual([
      {
        alt: "The home page.",
        width: 1280,
        height: 800,
        src: "/images/projects/pub-app/home-1280.png",
        srcSet: {
          avif: "/images/projects/pub-app/home-640.avif 640w, /images/projects/pub-app/home-1280.avif 1280w",
          webp: "/images/projects/pub-app/home-640.webp 640w, /images/projects/pub-app/home-1280.webp 1280w",
          png: "/images/projects/pub-app/home-640.png 640w, /images/projects/pub-app/home-1280.png 1280w",
        },
      },
    ]);
  });

  it("parses a private case study without a repo", () => {
    const study = parse("priv-app.mdx", source(validPrivate));
    expect(study.access).toBe("private");
    expect(study.repo).toBeUndefined();
    expect(study.screenshots).toEqual([]);
  });

  it("rejects a repo link on a private project", () => {
    const src = source(
      `${validPrivate}\nrepo: https://github.com/llevintza/priv-app`,
    );
    expect(() => parse("priv-app.mdx", src)).toThrow(
      /repo: priv-app is private/,
    );
  });

  it("rejects a public repo that differs from the featured entry", () => {
    const src = source(
      validPublic.replace("llevintza/pub-app", "someone/else"),
    );
    expect(() => parse("pub-app.mdx", src)).toThrow(/repo: must be https/);
  });

  it("requires the slug to match the file name and a featured project", () => {
    expect(() => parse("other.mdx", source(validPublic))).toThrow(
      /does not match the file name \(other\.mdx\)/,
    );
    const unknown = source(validPrivate.replace("priv-app", "nope"));
    expect(() => parse("nope.mdx", unknown)).toThrow(
      /"nope" is not a featured project/,
    );
  });

  it("lists every missing or invalid field", () => {
    const src = source("title: X\nslug: Bad Slug\nstack: []\nextra: 1");
    let error: unknown;
    try {
      parse("x.mdx", src);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ContentError);
    const message = (error as Error).message;
    expect(message).toContain("Invalid case study x.mdx");
    expect(message).toContain("slug: must be lowercase and hyphenated");
    expect(message).toContain("summary: is required");
    expect(message).toContain("stack: must list at least one technology");
    expect(message).toContain("unknown field(s): extra");
  });

  it("requires alt text on screenshots", () => {
    const src = source(validPublic.replace("    alt: The home page.", ""));
    expect(() => parse("pub-app.mdx", src)).toThrow(
      /screenshots\.0\.alt: is required/,
    );
  });

  it("fails when a screenshot variant is missing", () => {
    const src = source(validPublic.replace("file: home", "file: gone"));
    expect(() => parse("pub-app.mdx", src)).toThrow(
      /missing gone-640\.avif.*run pnpm screenshots:projects pub-app/,
    );
  });

  it("rejects non-https URLs", () => {
    const src = source(
      validPublic.replace("https://example.org", "http://example.org"),
    );
    expect(() => parse("pub-app.mdx", src)).toThrow(
      /liveUrl: must be an https:\/\/ URL/,
    );
  });

  it("requires ## Problem and ## Approach, in that order", () => {
    expect(() =>
      parse("priv-app.mdx", source(validPrivate, "## Approach\n\nOnly.\n")),
    ).toThrow(/missing a "## Problem" section/);
    expect(() =>
      parse(
        "priv-app.mdx",
        source(validPrivate, "## Approach\n\nA.\n\n## Problem\n\nP.\n"),
      ),
    ).toThrow(/"## Approach" must come after "## Problem"/);
  });

  it("fails without frontmatter", () => {
    expect(() => parse("pub-app.mdx", BODY)).toThrow(/missing frontmatter/);
  });
});

describe("readPngSize", () => {
  it("reads IHDR and rejects non-PNG data", () => {
    expect(readPngSize(pngHeader(10, 20))).toEqual({ width: 10, height: 20 });
    expect(readPngSize(Buffer.from("not a png at all, really"))).toBeNull();
  });
});

describe("content/projects", () => {
  const studies = getAllCaseStudies();

  it("covers every public featured project", () => {
    const slugs = new Set(studies.map((s) => s.slug));
    const missing = featuredProjects
      .filter((p) => p.access === "public" && !slugs.has(p.name))
      .map((p) => p.name);
    expect(missing).toEqual([]);
  });

  it("never links a private repo", () => {
    for (const study of studies.filter((s) => s.access === "private")) {
      expect(study.repo).toBeUndefined();
      expect(study.body).not.toMatch(
        new RegExp(`github\\.com/llevintza/${study.slug}\\b`),
      );
    }
  });
});
