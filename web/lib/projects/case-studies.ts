import fs from "node:fs";
import path from "node:path";

import { imageSize } from "image-size";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

import { featuredProjects, type FeaturedProject } from "@/content/featured";
import { ContentError } from "@/lib/content/frontmatter";

/**
 * Project case studies (issue #24): `content/projects/<slug>.mdx`, rendered at
 * `/projects/<slug>/`. Each one belongs to a featured project, and the build
 * fails with a clear message when a file is invalid.
 */

export const CASE_STUDIES_DIR = path.join(process.cwd(), "content", "projects");
export const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Widths written by `scripts/capture-project-screenshots.mjs`. */
export const SCREENSHOT_WIDTHS = [640, 1280] as const;
export const SCREENSHOT_FORMATS = ["avif", "webp", "png"] as const;

/** Sections the MDX body must have, in this order. The page adds the rest. */
export const REQUIRED_SECTIONS = ["Problem", "Approach"] as const;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = z
  .string({ error: typeError("a string") })
  .trim()
  .min(1, "must not be empty");

const httpsUrl = text.refine((value) => /^https:\/\/[^\s]+$/.test(value), {
  error: (issue) =>
    `must be an https:// URL, got ${JSON.stringify(issue.input)}`,
});

const screenshotSchema = z.strictObject(
  {
    /** Base name: `home` -> `home-640.avif`, `home-1280.png`, ... */
    file: text.regex(SLUG_RE, {
      error: (issue) =>
        `must be lowercase and hyphenated, got ${JSON.stringify(issue.input)}`,
    }),
    /** Describes what the screenshot shows; required for accessibility. */
    alt: text,
    /** Page to capture, if not the project's liveUrl (capture script only). */
    url: httpsUrl.optional(),
  },
  { error: unknownKeys },
);

/** A file name in `public/projects/<slug>/`: `walkthrough.mp4`. */
const assetFile = (extensions: readonly string[]) =>
  text.regex(
    new RegExp(`^[a-z0-9]+(?:[.-][a-z0-9]+)*\\.(?:${extensions.join("|")})$`),
    {
      error: (issue) =>
        `must be a lowercase file name ending in .${extensions.join(" or .")}, got ${JSON.stringify(issue.input)}`,
    },
  );

export const VIDEO_EXTENSIONS = ["mp4"] as const;
export const POSTER_EXTENSIONS = ["webp", "png"] as const;
export const CAPTIONS_EXTENSIONS = ["vtt"] as const;

/**
 * A self-hosted walkthrough video (#111). Files live in
 * `public/projects/<slug>/`; the poster gives the player its size.
 */
const videoSchema = z.strictObject(
  {
    file: assetFile(VIDEO_EXTENSIONS),
    poster: assetFile(POSTER_EXTENSIONS),
    /** WebVTT captions (English), when the video has narration. */
    captions: assetFile(CAPTIONS_EXTENSIONS).optional(),
    /** Visible heading and the player's accessible name. */
    title: text,
    /** What the video shows, in words, under the player. */
    summary: text,
  },
  { error: unknownKeys },
);

/** Strict, so a typo such as `screenshot:` fails instead of being ignored. */
export const caseStudySchema = z.strictObject(
  {
    title: text,
    /** Must match the file name and a featured project's `name`. */
    slug: text.regex(SLUG_RE, {
      error: (issue) =>
        `must be lowercase and hyphenated, got ${JSON.stringify(issue.input)}`,
    }),
    summary: text,
    stack: z.array(text, { error: typeError("a list of strings") }).min(1, {
      error: "must list at least one technology",
    }),
    liveUrl: httpsUrl.optional(),
    /** Public repos only; must equal the featured entry's `repoUrl`. */
    repo: httpsUrl.optional(),
    screenshots: z
      .array(screenshotSchema, { error: typeError("a list") })
      .default([]),
    video: videoSchema.optional(),
  },
  { error: unknownKeys },
);

export type CaseStudyFrontmatter = z.infer<typeof caseStudySchema>;

export interface Screenshot {
  alt: string;
  /** Intrinsic size of the largest variant, for `width`/`height`. */
  width: number;
  height: number;
  /** Site-relative URL of the PNG fallback (largest width). */
  src: string;
  /** `srcset` strings per format, smallest first. */
  srcSet: Record<(typeof SCREENSHOT_FORMATS)[number], string>;
}

export interface CaseStudyVideo {
  /** Site-relative URLs. */
  src: string;
  poster: string;
  captions?: string;
  /** Intrinsic size, read from the poster, for `width`/`height`. */
  width: number;
  height: number;
  title: string;
  summary: string;
}

interface CaseStudyBase {
  title: string;
  slug: string;
  summary: string;
  stack: string[];
  liveUrl?: string;
  screenshots: Screenshot[];
  video?: CaseStudyVideo;
  /** `/projects/<slug>/`. */
  permalink: string;
  /** Source file, relative to the app root (for error messages). */
  file: string;
  /** Raw MDX body (frontmatter stripped). */
  body: string;
}

/** A public repo: the page links its source. */
export interface PublicCaseStudy extends CaseStudyBase {
  access: "public";
  repo: string;
}

/**
 * A private repo, named only (#111). The type makes a `repo` a compile
 * error, like `PrivateFeaturedProject`; `parseCaseStudy` re-checks the
 * frontmatter and the whole file for a link to the repo at build time.
 */
export interface PrivateCaseStudy extends CaseStudyBase {
  access: "private";
  repo?: never;
}

export type CaseStudy = PublicCaseStudy | PrivateCaseStudy;

export interface ParseOptions {
  featured?: readonly FeaturedProject[];
  /** Where `images/projects/<slug>/` lives. Defaults to `public/`. */
  publicDir?: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** Parses and validates one case study. Throws a `ContentError` if invalid. */
export function parseCaseStudy(
  file: string,
  source: string,
  { featured = featuredProjects, publicDir = PUBLIC_DIR }: ParseOptions = {},
): CaseStudy {
  const fail = (problems: string[]): never => {
    throw new ContentError(
      `Invalid case study ${file}:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  };

  const match = FRONTMATTER_RE.exec(source);
  if (!match) {
    fail(["missing frontmatter (a --- block at the top of the file)"]);
  }

  let data: unknown;
  try {
    data = parseYaml(match![1]) ?? {};
  } catch (error) {
    fail([`YAML parse error: ${(error as Error).message}`]);
  }

  const result = caseStudySchema.safeParse(data);
  if (!result.success) {
    fail(
      result.error.issues.map((issue) => {
        const field = issue.path.length
          ? issue.path.join(".")
          : "(frontmatter)";
        return `${field}: ${issue.message}`;
      }),
    );
  }
  const fm = result.data!;
  const body = source.slice(match![0].length);

  const problems: string[] = [];
  const fileSlug = path.basename(file, ".mdx");
  if (fm.slug !== fileSlug) {
    problems.push(
      `slug: "${fm.slug}" does not match the file name (${fileSlug}.mdx)`,
    );
  }

  const project = featured.find((p) => p.name === fm.slug);
  if (!project) {
    problems.push(
      `slug: "${fm.slug}" is not a featured project in content/featured.ts`,
    );
  } else if (project.access === "private") {
    if (fm.repo !== undefined) {
      problems.push(
        `repo: ${fm.slug} is private; private repos are listed by name only, so remove repo`,
      );
    }
    // Anywhere in the file: body, alt text, video title or summary.
    for (const link of findRepoLinks(source, fm.slug)) {
      problems.push(
        `${fm.slug} is private, so the file must not link its repo (found ${link}); name it without a link`,
      );
    }
  } else if (fm.repo !== project.repoUrl) {
    problems.push(
      `repo: must be ${project.repoUrl} (the featured entry's repoUrl), got ${JSON.stringify(fm.repo)}`,
    );
  }

  if (project) {
    // Single source: stack and liveUrl must match content/featured.ts.
    if (JSON.stringify(fm.stack) !== JSON.stringify(project.stack)) {
      problems.push(
        `stack: must match the featured entry's stack in content/featured.ts (${project.stack.join(", ")})`,
      );
    }
    if (fm.liveUrl !== project.liveUrl) {
      problems.push(
        `liveUrl: must match the featured entry's liveUrl in content/featured.ts (${project.liveUrl ?? "none"}), got ${JSON.stringify(fm.liveUrl)}`,
      );
    }
  }

  problems.push(...checkSections(body));

  const screenshots: Screenshot[] = [];
  for (const [i, shot] of fm.screenshots.entries()) {
    const resolved = resolveScreenshot(fm.slug, shot, publicDir);
    if (typeof resolved === "string") {
      problems.push(`screenshots.${i}: ${resolved}`);
    } else {
      screenshots.push(resolved);
    }
  }

  let video: CaseStudyVideo | undefined;
  if (fm.video) {
    const resolved = resolveVideo(fm.slug, fm.video, publicDir);
    if (typeof resolved === "string") problems.push(`video: ${resolved}`);
    else video = resolved;
  }

  if (problems.length > 0) fail(problems);

  const base: CaseStudyBase = {
    title: fm.title,
    slug: fm.slug,
    summary: fm.summary,
    stack: fm.stack,
    liveUrl: fm.liveUrl,
    screenshots,
    video,
    permalink: `/projects/${fm.slug}/`,
    file,
    body,
  };
  return project!.access === "public"
    ? { ...base, access: "public", repo: fm.repo! }
    : { ...base, access: "private" };
}

/**
 * Links to `github.com/llevintza/<repo>` in any spelling the guardrail
 * catches (URL-encoded or JSON-escaped slashes), not `<repo>-other`.
 */
export function findRepoLinks(source: string, repo: string): string[] {
  const escaped = repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sep = String.raw`(?:/|%2F|\\/)`;
  const re = new RegExp(
    String.raw`github\.com${sep}llevintza${sep}${escaped}(?![\w-]|\.(?!git\b)\w)`,
    "gi",
  );
  return [...source.matchAll(re)].map((m) => m[0]);
}

/** Checks the video, poster and captions exist; reads the poster's size. */
function resolveVideo(
  slug: string,
  video: NonNullable<CaseStudyFrontmatter["video"]>,
  publicDir: string,
): CaseStudyVideo | string {
  const urlDir = `/projects/${slug}`;
  const diskDir = path.join(publicDir, "projects", slug);
  const names = [video.file, video.poster, video.captions].filter(
    (name): name is string => name !== undefined,
  );
  const missing = names.filter(
    (name) => !fs.existsSync(path.join(diskDir, name)),
  );
  if (missing.length > 0) {
    return `missing ${missing.join(", ")} in public${urlDir}/`;
  }
  const size = readImageSize(
    fs.readFileSync(path.join(diskDir, video.poster)),
    POSTER_EXTENSIONS,
  );
  if (!size)
    return `public${urlDir}/${video.poster} is not a valid PNG or WebP`;
  return {
    src: `${urlDir}/${video.file}`,
    poster: `${urlDir}/${video.poster}`,
    captions: video.captions ? `${urlDir}/${video.captions}` : undefined,
    ...size,
    title: video.title,
    summary: video.summary,
  };
}

/** `## Problem` then `## Approach`, each exactly once. */
function checkSections(body: string): string[] {
  // Ignore fenced code blocks, so a "## Problem" in a sample doesn't count.
  const prose = body.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "");
  const headings = [...prose.matchAll(/^##[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)].map(
    (m) => m[1],
  );
  const problems: string[] = [];
  let last = -1;
  for (const section of REQUIRED_SECTIONS) {
    const index = headings.indexOf(section);
    if (index === -1) {
      problems.push(`body: missing a "## ${section}" section`);
    } else if (index < last) {
      problems.push(
        `body: "## ${section}" must come after "## ${REQUIRED_SECTIONS[REQUIRED_SECTIONS.indexOf(section) - 1]}"`,
      );
    } else {
      last = index;
    }
  }
  return problems;
}

/** Checks every variant exists and reads the size from the largest PNG. */
function resolveScreenshot(
  slug: string,
  shot: CaseStudyFrontmatter["screenshots"][number],
  publicDir: string,
): Screenshot | string {
  const urlDir = `/images/projects/${slug}`;
  const diskDir = path.join(publicDir, "images", "projects", slug);
  const missing: string[] = [];
  for (const width of SCREENSHOT_WIDTHS) {
    for (const format of SCREENSHOT_FORMATS) {
      const name = `${shot.file}-${width}.${format}`;
      if (!fs.existsSync(path.join(diskDir, name))) missing.push(name);
    }
  }
  if (missing.length > 0) {
    return `missing ${missing.join(", ")} in public${urlDir}/ (run pnpm screenshots:projects ${slug})`;
  }

  const largest = SCREENSHOT_WIDTHS[SCREENSHOT_WIDTHS.length - 1];
  const pngName = `${shot.file}-${largest}.png`;
  const size = readImageSize(fs.readFileSync(path.join(diskDir, pngName)), [
    "png",
  ]);
  if (!size) return `public${urlDir}/${pngName} is not a valid PNG`;

  const srcSet = (format: string) =>
    SCREENSHOT_WIDTHS.map(
      (w) => `${urlDir}/${shot.file}-${w}.${format} ${w}w`,
    ).join(", ");

  return {
    alt: shot.alt,
    ...size,
    src: `${urlDir}/${pngName}`,
    srcSet: { avif: srcSet("avif"), webp: srcSet("webp"), png: srcSet("png") },
  };
}

/**
 * Width and height of a PNG or WebP via `image-size` (also used by
 * mdx-image), or null if the data isn't an image of an allowed type.
 */
export function readImageSize(
  data: Buffer,
  types: readonly string[],
): { width: number; height: number } | null {
  try {
    const { type, width, height } = imageSize(data);
    return type && types.includes(type) && width && height
      ? { width, height }
      : null;
  } catch {
    return null;
  }
}

const cache = new Map<string, CaseStudy[]>();

/** All case studies, in the order of `content/featured.ts`. */
export function getAllCaseStudies(
  dir: string = CASE_STUDIES_DIR,
  options: ParseOptions = {},
): CaseStudy[] {
  // Cache in production builds only, so edits show up in `next dev`.
  const useCache = process.env.NODE_ENV === "production";
  const cached = useCache ? cache.get(dir) : undefined;
  if (cached) return cached;

  const featured = options.featured ?? featuredProjects;
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => name.endsWith(".mdx"))
    : [];
  const studies = files
    .map((name) => {
      const fullPath = path.join(dir, name);
      const file = path.relative(process.cwd(), fullPath);
      return parseCaseStudy(file, fs.readFileSync(fullPath, "utf8"), options);
    })
    .sort(
      (a, b) =>
        featured.findIndex((p) => p.name === a.slug) -
        featured.findIndex((p) => p.name === b.slug),
    );

  if (useCache) cache.set(dir, studies);
  return studies;
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return getAllCaseStudies().find((study) => study.slug === slug);
}

function typeError(expected: string) {
  return (issue: { input?: unknown }) =>
    issue.input === undefined
      ? "is required"
      : `must be ${expected}, got ${JSON.stringify(issue.input)}`;
}

function unknownKeys(issue: { code?: string; keys?: string[] }) {
  return issue.code === "unrecognized_keys"
    ? `unknown field(s): ${issue.keys?.join(", ")}`
    : undefined;
}
