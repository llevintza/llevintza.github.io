import type { PostMeta } from "@/lib/content/posts";
import { SITE_URL, canonicalPath } from "@/lib/site/metadata";

/** Longer titles are cut at a word boundary with an ellipsis. */
export const MAX_TITLE_LENGTH = 90;
export const MAX_SUBTITLE_LENGTH = 140;
/** The top-bar prompt is cut so it stays on one line. */
export const MAX_PROMPT_LENGTH = 36;
/** Posts show at most this many tags, so the subtitle stays on one line. */
export const MAX_TAGS = 4;

/** What a card shows. Build it with `pageCard` or `postCard`. */
export interface OgCard {
  /** Big text. */
  title: string;
  /** One muted line under the title: page summary, or post date and tags. */
  subtitle: string;
  /** Terminal-style prompt in the top bar, such as `~/blog/my-post`. */
  prompt: string;
  /** Title font size in px, smaller for longer titles. */
  titleSize: number;
}

/**
 * Code points the bundled fonts cover: the subset ranges in
 * app/fonts/README.md. For any glyph outside them, `next/og` would fetch a
 * fallback font from Google Fonts or an emoji from a CDN during the build, so
 * card text is limited to these.
 */
export const SUPPORTED_RANGES: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ff],
  [0x0131, 0x0131],
  [0x0152, 0x0153],
  [0x02bb, 0x02bc],
  [0x02c6, 0x02c6],
  [0x02da, 0x02da],
  [0x02dc, 0x02dc],
  [0x2010, 0x2027],
  [0x2030, 0x205e],
  [0x20ac, 0x20ac],
  [0x2122, 0x2122],
  [0x2190, 0x21ff],
  [0x2212, 0x2212],
  [0x2500, 0x259f],
];

function isSupported(char: string): boolean {
  const code = char.codePointAt(0)!;
  return SUPPORTED_RANGES.some(([lo, hi]) => code >= lo && code <= hi);
}

/**
 * Keeps text inside the bundled fonts' coverage. An unsupported character is
 * replaced by its compatibility decomposition without accents when that fits
 * (`ő` -> `o`, `ﬁ` -> `fi`, fullwidth `Ａ` -> `A`); otherwise it is dropped
 * (emoji, CJK). Whitespace (including control characters) becomes one space.
 */
export function toSupportedText(text: string): string {
  let out = "";
  for (const char of text) {
    if (/\s/.test(char) || /\p{Cc}/u.test(char)) {
      out += " ";
    } else if (isSupported(char)) {
      out += char;
    } else {
      const plain = char.normalize("NFKD").replace(/\p{M}/gu, "");
      if (plain && [...plain].every(isSupported)) out += plain;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Cuts `text` to `max` characters at a word boundary, adding `…`. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:·–—-]+$/, "")}…`;
}

/** Title size steps so a long title still fits in three lines. */
export function titleSizeFor(title: string): number {
  if (title.length <= 24) return 84;
  if (title.length <= 48) return 68;
  if (title.length <= 64) return 56;
  return 48;
}

/** `/blog/2026/11/09/my-post/` -> `~/blog/my-post`; `/` -> `~`. */
export function promptFor(path: string): string {
  const segments = canonicalPath(path).split("/").filter(Boolean);
  if (segments.length === 0) return "~";
  // Post permalinks: drop the date segments, they're in the subtitle.
  const shown =
    segments[0] === "blog" && segments.length === 5
      ? ["blog", segments[4]]
      : segments;
  const prompt = `~/${shown.join("/")}`;
  return prompt.length <= MAX_PROMPT_LENGTH
    ? prompt
    : `${prompt.slice(0, MAX_PROMPT_LENGTH - 1)}…`;
}

function card(title: string, subtitle: string, path: string): OgCard {
  const shortTitle = truncate(toSupportedText(title), MAX_TITLE_LENGTH);
  return {
    title: shortTitle,
    subtitle: truncate(toSupportedText(subtitle), MAX_SUBTITLE_LENGTH),
    prompt: toSupportedText(promptFor(path)),
    titleSize: titleSizeFor(shortTitle),
  };
}

/** A card for a page: its title and summary. */
export function pageCard({
  title,
  subtitle,
  path,
}: {
  title: string;
  subtitle: string;
  path: string;
}): OgCard {
  return card(title, subtitle, path);
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** A card for a post: its title, then `Nov 9, 2026 · #tag #tag`. */
export function postCard(
  post: Pick<PostMeta, "title" | "date" | "tags" | "permalink">,
): OgCard {
  const date = dateFormat.format(new Date(`${post.date}T00:00:00Z`));
  const tags = post.tags.slice(0, MAX_TAGS).map((tag) => `#${tag}`);
  const subtitle = [date, tags.join(" ")].filter(Boolean).join(" · ");
  return card(post.title, subtitle, post.permalink);
}

/** Shown in the footer of every card. */
export const SITE_HOST = new URL(SITE_URL).host;
