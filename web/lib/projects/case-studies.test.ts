import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { featuredProjects, type FeaturedProject } from "@/content/featured";

import { ContentError } from "@/lib/content/frontmatter";
import {
  getAllCaseStudies,
  parseCaseStudy,
  findRepoLinks,
  readImageSize,
  SCREENSHOT_FORMATS,
  type CaseStudy,
  type PrivateCaseStudy,
  type PublicCaseStudy,
  SCREENSHOT_WIDTHS,
} from "./case-studies";

const featured: FeaturedProject[] = [
  {
    name: "pub-app",
    access: "public",
    repoUrl: "https://github.com/llevintza/pub-app",
    description: "A public project.",
    liveUrl: "https://example.org/pub-app/",
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

/** A minimal lossy WebP (`VP8 `) header with the given size. */
function webpHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(22, 4);
  buf.write("WEBP", 8, "ascii");
  buf.write("VP8 ", 12, "ascii");
  buf.writeUInt16LE(width, 26);
  buf.writeUInt16LE(height, 28);
  return buf;
}

beforeAll(() => {
  const dir = path.join(publicDir, "projects", "priv-app");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "demo.mp4"), "");
  fs.writeFileSync(path.join(dir, "demo.en.vtt"), "WEBVTT\n");
  fs.writeFileSync(path.join(dir, "demo-poster.webp"), webpHeader(1280, 720));
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
  "stack: [TypeScript]",
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

const videoYaml = [
  "video:",
  "  file: demo.mp4",
  "  poster: demo-poster.webp",
  "  captions: demo.en.vtt",
  "  title: Walkthrough",
  "  summary: Shows the app.",
  "",
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
      stack: ["TypeScript"],
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

  it("rejects a private repo link anywhere in the file", () => {
    for (const link of [
      "https://github.com/llevintza/priv-app",
      "github.com/llevintza/Priv-App/blob/main/README.md",
      "github.com%2Fllevintza%2Fpriv-app",
    ]) {
      const inBody = source(
        validPrivate,
        `${BODY}\nSee [the code](${link}).\n`,
      );
      expect(() => parse("priv-app.mdx", inBody)).toThrow(
        /priv-app is private, so the file must not link its repo/,
      );
    }
    const inVideo = source(
      `${validPrivate}\n${videoYaml.replace("Shows the app.", "The code is at github.com/llevintza/priv-app")}`,
    );
    expect(() => parse("priv-app.mdx", inVideo)).toThrow(
      /must not link its repo \(found github\.com\/llevintza\/priv-app\)/,
    );
    // Its live site and similarly named repos are fine.
    const ok = source(
      validPrivate,
      `${BODY}\nhttps://llevintza.github.io/priv-app/ and https://github.com/llevintza/priv-app-client\n`,
    );
    expect(parse("priv-app.mdx", ok).access).toBe("private");
  });

  it("parses a video and reads its size from the poster", () => {
    const study = parse(
      "priv-app.mdx",
      source(`${validPrivate}\n${videoYaml}`),
    );
    expect(study.video).toEqual({
      src: "/projects/priv-app/demo.mp4",
      poster: "/projects/priv-app/demo-poster.webp",
      captions: "/projects/priv-app/demo.en.vtt",
      width: 1280,
      height: 720,
      title: "Walkthrough",
      summary: "Shows the app.",
    });
  });

  it("validates the video fields and files", () => {
    const missing = source(
      `${validPrivate}\n${videoYaml.replace("demo.mp4", "gone.mp4")}`,
    );
    expect(() => parse("priv-app.mdx", missing)).toThrow(
      /video: missing gone\.mp4 in public\/projects\/priv-app\//,
    );
    const bad = source(
      `${validPrivate}\n${videoYaml
        .replace("demo.mp4", "Demo.mov")
        .replace("  summary: Shows the app.\n", "")
        .replace(
          "title: Walkthrough",
          "title: Walkthrough\n  autoplay: true",
        )}`,
    );
    let message = "";
    try {
      parse("priv-app.mdx", bad);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain(
      "video.file: must be a lowercase file name ending in .mp4",
    );
    expect(message).toContain("video.summary: is required");
    expect(message).toContain("unknown field(s): autoplay");
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

  it("requires stack and liveUrl to match content/featured.ts", () => {
    const drifted = source(
      validPublic
        .replace("stack: [TypeScript]", "stack: [TypeScript, Node]")
        .replace("example.org/pub-app/", "example.org/elsewhere/"),
    );
    expect(() => parse("pub-app.mdx", drifted)).toThrow(
      /stack: must match the featured entry's stack[\s\S]*liveUrl: must match the featured entry's liveUrl/,
    );
    const extraLive = source(`${validPrivate}\nliveUrl: https://example.org/`);
    expect(() => parse("priv-app.mdx", extraLive)).toThrow(
      /liveUrl: must match the featured entry's liveUrl in content\/featured\.ts \(none\)/,
    );
  });

  it("ignores section headings inside fenced code blocks", () => {
    const fenced =
      "```md\n## Problem\n\n## Approach\n```\n\nNo real sections.\n";
    expect(() => parse("priv-app.mdx", source(validPrivate, fenced))).toThrow(
      /missing a "## Problem" section[\s\S]*missing a "## Approach" section/,
    );
    const withSample = `${BODY}\n\`\`\`md\n## Problem\n\`\`\`\n`;
    expect(parse("priv-app.mdx", source(validPrivate, withSample)).slug).toBe(
      "priv-app",
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

describe("findRepoLinks", () => {
  it("finds the repo in URL-encoded and JSON-escaped spellings only", () => {
    const text = [
      "https://github.com/llevintza/priv-app",
      "https:\\/\\/github.com\\/llevintza\\/priv-app",
      "github.com/llevintza/priv-app.git",
      "github.com/llevintza/priv-app-client",
      "github.com/someone/priv-app",
    ].join(" ");
    expect(findRepoLinks(text, "priv-app")).toHaveLength(3);
  });
});

describe("CaseStudy type", () => {
  it("makes repo required on public and impossible on private studies", () => {
    const base = {
      title: "T",
      slug: "t",
      summary: "S",
      stack: ["Go"],
      screenshots: [],
      permalink: "/projects/t/",
      file: "t.mdx",
      body: "",
    };
    const pub: PublicCaseStudy = {
      ...base,
      access: "public",
      repo: "https://x",
    };
    // @ts-expect-error a public case study must have a repo
    const noRepo: PublicCaseStudy = { ...base, access: "public" };
    const priv: PrivateCaseStudy = { ...base, access: "private" };
    const leak: PrivateCaseStudy = {
      ...base,
      access: "private",
      // @ts-expect-error a private case study can't carry a repo link
      repo: "https://x",
    };
    const studies: CaseStudy[] = [pub, noRepo, priv, leak];
    expect(studies.filter((s) => s.access === "private")).toHaveLength(2);
  });
});

describe("readImageSize", () => {
  it("reads PNG and WebP sizes and rejects other types or data", () => {
    expect(readImageSize(pngHeader(10, 20), ["png"])).toEqual({
      width: 10,
      height: 20,
    });
    expect(readImageSize(webpHeader(640, 360), ["webp", "png"])).toEqual({
      width: 640,
      height: 360,
    });
    expect(readImageSize(webpHeader(640, 360), ["png"])).toBeNull();
    expect(
      readImageSize(Buffer.from("not an image at all, really"), ["png"]),
    ).toBeNull();
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
      const raw = fs.readFileSync(study.file, "utf8");
      expect(findRepoLinks(raw, study.slug)).toEqual([]);
    }
  });

  it("has a page for allocator-memo-builder, a private project, with its video", () => {
    const study = studies.find((s) => s.slug === "allocator-memo-builder");
    expect(study?.access).toBe("private");
    expect(study?.repo).toBeUndefined();
    expect(study?.video).toMatchObject({
      src: "/projects/allocator-memo-builder/walkthrough.mp4",
      poster: "/projects/allocator-memo-builder/walkthrough-poster.webp",
      captions: "/projects/allocator-memo-builder/walkthrough.en.vtt",
      width: 1280,
      height: 720,
    });
  });
});
