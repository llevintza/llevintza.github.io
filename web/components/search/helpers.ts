/**
 * Pure helpers for site search (#19): keyboard shortcuts, excerpt parsing and
 * result metadata. No DOM or React here, so they're unit-tested in Vitest.
 */

/** The subset of a KeyboardEvent the shortcut checks read. */
export type ShortcutEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/** True on macOS and iOS, where the shortcut uses Cmd instead of Ctrl. */
export function isApplePlatform(platform: string | undefined): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform ?? "");
}

/**
 * Cmd+K or Ctrl+K. Both work everywhere, as on most sites with a palette:
 * a platform check can be wrong (browser emulation, remote desktops), and
 * the hint in the header already shows the platform's usual key.
 */
export function isPaletteShortcut(event: ShortcutEvent) {
  return (
    event.key.toLowerCase() === "k" &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  );
}

/** A bare `/` (no modifier), the quick-search key used by many sites. */
export function isSlashShortcut(event: ShortcutEvent) {
  return event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
}

/** What `isTypingTarget` needs to know about the focused element. */
export type TargetInfo = {
  tagName?: string;
  isContentEditable?: boolean;
  type?: string;
};

// Input types that don't take text, so `/` there is safe to capture.
const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** True when the user is typing into a field, so `/` must not be captured. */
export function isTypingTarget(target: TargetInfo | null | undefined) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    return !NON_TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
  }
  return false;
}

/** Moves the active result with wrap-around; -1 means "none active". */
export function moveActive(
  current: number,
  delta: number,
  count: number,
): number {
  if (count <= 0) return -1;
  if (current < 0) return delta > 0 ? 0 : count - 1;
  return (((current + delta) % count) + count) % count;
}

/** A run of excerpt text; `match` runs are the highlighted query terms. */
export type ExcerptPart = { text: string; match: boolean };

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decodes the HTML entities Pagefind can emit in an excerpt. */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,
    (whole, code: string) => {
      if (code[0] === "#") {
        const n =
          code[1] === "x" || code[1] === "X"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n <= 0x10ffff
          ? String.fromCodePoint(n)
          : whole;
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    },
  );
}

/**
 * Splits a Pagefind excerpt (escaped text with `<mark>` around matches) into
 * plain-text parts, so it renders as React text and never as raw HTML. Any
 * other tag is dropped.
 */
export function parseExcerpt(excerpt: string): ExcerptPart[] {
  const parts: ExcerptPart[] = [];
  const push = (raw: string, match: boolean) => {
    const text = decodeEntities(raw.replace(/<[^>]*>/g, ""));
    if (!text) return;
    const last = parts.at(-1);
    if (last && last.match === match) last.text += text;
    else parts.push({ text, match });
  };
  const re = /<mark>([\s\S]*?)<\/mark>/gi;
  let index = 0;
  for (const m of excerpt.matchAll(re)) {
    push(excerpt.slice(index, m.index), false);
    push(m[1], true);
    index = m.index + m[0].length;
  }
  push(excerpt.slice(index), false);
  return parts;
}

/** `/blog/2026/11/09/slug/` -> `2026-11-09`; null for anything else. */
export function dateFromUrl(url: string): string | null {
  const m = /^\/blog\/(\d{4})\/(\d{2})\/(\d{2})\/[^/]+\/?$/.exec(url);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** The label shown before a result: `post`, `project` or `page`. */
export function resultKind(url: string): "post" | "project" | "page" {
  if (dateFromUrl(url)) return "post";
  if (url.startsWith("/projects/")) return "project";
  return "page";
}
