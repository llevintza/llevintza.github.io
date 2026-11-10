import type { CSSProperties } from "react";

import styles from "./motion.module.css";

type TypedTextProps = {
  /** One line of text. Typing assumes a monospace font (it steps in `ch`). */
  text: string;
  /** Milliseconds before the first character appears. Default 200. */
  startDelay?: number;
  /** Milliseconds per character. Default 45. */
  charDelay?: number;
  /** Block cursor: travels with the typing, then blinks. Default "blink". */
  cursor?: "blink" | "solid" | "none";
  className?: string;
};

/**
 * One-shot typing of a single line, such as the hero prompt
 * (`whoami --long`). Pure CSS, so it works in a Server Component and
 * finishes even if JavaScript fails. The full text is in the DOM from the
 * start (space reserved, screen readers get the whole string once), and
 * under `prefers-reduced-motion` it shows complete with a solid cursor.
 */
export function TypedText({
  text,
  startDelay = 200,
  charDelay = 45,
  cursor = "blink",
  className,
}: TypedTextProps) {
  const chars = Array.from(text);
  const vars = {
    "--chars": chars.length,
    "--delay": `${startDelay}ms`,
    "--step": `${charDelay}ms`,
  } as CSSProperties;

  return (
    <span className={[styles.typed, className].filter(Boolean).join(" ")}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" style={vars}>
        {chars.map((char, i) => (
          <span
            key={i}
            className={styles.char}
            style={{ "--i": i } as CSSProperties}
          >
            {char}
          </span>
        ))}
        {cursor !== "none" && (
          <span
            className={
              cursor === "solid"
                ? `${styles.cursor} ${styles.cursorNoBlink}`
                : styles.cursor
            }
          />
        )}
      </span>
    </span>
  );
}
