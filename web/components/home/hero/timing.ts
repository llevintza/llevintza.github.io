import { terminalLinesDuration, typedTextDuration } from "@/components/motion";

/** The hero prompt's command, typed first. */
export const heroCommand = "whoami --long";

/** Tagline rows print once the prompt has finished typing. */
export const taglineStart = typedTextDuration(heroCommand) + 150;
export const heroLineDelay = 90;

/** Terminal panel rows start shortly after the page paints. */
export const panelStart = 300;

/** The npm lines follow the last repo row. */
export function npmStart(rows: number) {
  return (
    terminalLinesDuration(rows, {
      startDelay: panelStart,
      lineDelay: heroLineDelay,
    }) +
    2 * heroLineDelay
  );
}
