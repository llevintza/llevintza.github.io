import fs from "node:fs";
import path from "node:path";

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

export interface CaseStudy {
  title: string;
  slug: string;
  summary: string;
  stack: string[];
  liveUrl?: string;
  repo?: string;
  access: FeaturedProject["access"];
  screenshots: Screenshot[];
  /** `/projects/<slug>/`. */
  permalink: string;
  /** Source file, relative to the app root (for error messages). */
  file: string;
  /** Raw MDX body (frontmatter stripped). */
  body: string;
}

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
  } else if (fm.repo !== project.repoUrl) {
    problems.push(
      `repo: must be ${project.repoUrl} (the featured entry's repoUrl), got ${JSON.stringify(fm.repo)}`,
    );
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

  if (problems.length > 0) fail(problems);

  return {
    title: fm.title,
    slug: fm.slug,
    summary: fm.summary,
    stack: fm.stack,
    liveUrl: fm.liveUrl,
    repo: fm.repo,
    access: project!.access,
    screenshots,
    permalink: `/projects/${fm.slug}/`,
    file,
    body,
  };
}

/** `## Problem` then `## Approach`, each exactly once. */
function checkSections(body: string): string[] {
  const headings = [...body.matchAll(/^##[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)].map(
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
  const size = readPngSize(fs.readFileSync(path.join(diskDir, pngName)));
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

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Width and height from a PNG's IHDR chunk, or null if it isn't a PNG. */
export function readPngSize(
  data: Buffer,
): { width: number; height: number } | null {
  if (
    data.length < 24 ||
    !data.subarray(0, 8).equals(PNG_SIGNATURE) ||
    data.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
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
