/**
 * Timing defaults and helpers for the CSS-driven console primitives
 * (`TypedText`, `TerminalLines`). Kept free of CSS imports so it can be unit
 * tested and used to chain a prompt, its output and the next prompt.
 */

export const typedTextDefaults = { startDelay: 200, charDelay: 45 } as const;
export const terminalLinesDefaults = { startDelay: 0, lineDelay: 80 } as const;

/** Time in ms until `TypedText` has finished typing `text`. */
export function typedTextDuration(
  text: string,
  {
    startDelay = typedTextDefaults.startDelay,
    charDelay = typedTextDefaults.charDelay,
  }: { startDelay?: number; charDelay?: number } = {},
) {
  return startDelay + Array.from(text).length * charDelay;
}

/** Time in ms until the last of `count` rows from `TerminalLines` has printed. */
export function terminalLinesDuration(
  count: number,
  {
    startDelay = terminalLinesDefaults.startDelay,
    lineDelay = terminalLinesDefaults.lineDelay,
  }: { startDelay?: number; lineDelay?: number } = {},
) {
  return startDelay + Math.max(0, count - 1) * lineDelay;
}
