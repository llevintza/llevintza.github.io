import { parse as parseYaml } from "yaml";
import { z } from "zod";

/** Tags become URLs (#16), so keep them lowercase and hyphenated. */
const TAG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A real calendar date written as YYYY-MM-DD (no time, no time zone). */
const isoDate = z
  .string({ error: typeError("a date string in YYYY-MM-DD form") })
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    error: (issue) => `must be YYYY-MM-DD, got ${JSON.stringify(issue.input)}`,
  })
  .refine(isCalendarDate, {
    error: (issue) =>
      `is not a real calendar date: ${JSON.stringify(issue.input)}`,
  });

/**
 * Post frontmatter. Strict, so a typo such as `tag:` instead of `tags:` fails
 * the build instead of being silently ignored.
 */
export const frontmatterSchema = z.strictObject(
  {
    title: z
      .string({ error: typeError("a string") })
      .trim()
      .min(1, "must not be empty"),
    date: isoDate,
    tags: z.array(
      z
        .string({ error: typeError("a string") })
        .trim()
        .regex(TAG_RE, {
          error: (issue) =>
            `must be lowercase and hyphenated (e.g. "next-js"), got ${JSON.stringify(issue.input)}`,
        }),
      { error: typeError("a list of strings") },
    ),
    summary: z
      .string({ error: typeError("a string") })
      .trim()
      .min(1, "must not be empty"),
    draft: z.boolean({ error: typeError("true or false") }).default(false),
  },
  {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `unknown field(s): ${issue.keys.join(", ")}`
        : undefined,
  },
);

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/** Thrown when a content file can't be turned into a post. */
export class ContentError extends Error {
  override name = "ContentError";
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Splits a source file into validated frontmatter and the MDX body.
 * `file` is only used in error messages.
 */
export function parseFrontmatter(
  file: string,
  source: string,
): { frontmatter: Frontmatter; body: string } {
  const match = FRONTMATTER_RE.exec(source);
  if (!match) {
    throw new ContentError(
      `Invalid post ${file}: missing frontmatter (a --- block at the top of the file)`,
    );
  }

  let data: unknown;
  try {
    // The YAML 1.2 core schema keeps `2026-11-09` a string, not a Date.
    data = parseYaml(match[1]) ?? {};
  } catch (error) {
    throw new ContentError(
      `Invalid frontmatter in ${file}: YAML parse error: ${(error as Error).message}`,
    );
  }

  const result = frontmatterSchema.safeParse(data);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const field = issue.path.length ? issue.path.join(".") : "(frontmatter)";
      return `  - ${field}: ${issue.message}`;
    });
    throw new ContentError(
      `Invalid frontmatter in ${file}:\n${problems.join("\n")}`,
    );
  }

  return { frontmatter: result.data, body: source.slice(match[0].length) };
}

function typeError(expected: string) {
  return (issue: { input?: unknown }) =>
    issue.input === undefined
      ? "is required"
      : `must be ${expected}, got ${JSON.stringify(issue.input)}`;
}

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
