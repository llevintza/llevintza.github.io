import { Children, type CSSProperties, type ReactNode } from "react";

import styles from "./motion.module.css";

type TerminalLinesProps = {
  /** Each child is one row; rows "print" one after another. */
  children: ReactNode;
  /** Milliseconds before the first row. Pair with `TypedText` timing. */
  startDelay?: number;
  /** Milliseconds between rows. Default 80. */
  lineDelay?: number;
  /** Render as a list; each row is then wrapped in an `li`. */
  as?: "div" | "ul" | "ol";
  className?: string;
  lineClassName?: string;
};

/**
 * Terminal-style "print" reveal: rows appear one by one, instantly (no
 * fade), like command output. Pure CSS, Server Component safe, finishes
 * without JavaScript, and static under `prefers-reduced-motion`. Rows only
 * change opacity, so their space is reserved from the first paint.
 */
export function TerminalLines({
  children,
  startDelay = 0,
  lineDelay = 80,
  as: Tag = "div",
  className,
  lineClassName,
}: TerminalLinesProps) {
  const LineTag = Tag === "div" ? "div" : "li";
  const vars = {
    "--delay": `${startDelay}ms`,
    "--step": `${lineDelay}ms`,
  } as CSSProperties;

  return (
    <Tag
      className={[styles.lines, className].filter(Boolean).join(" ")}
      style={vars}
    >
      {Children.toArray(children).map((child, i) => (
        <LineTag
          key={i}
          className={[styles.line, lineClassName].filter(Boolean).join(" ")}
          style={{ "--i": i } as CSSProperties}
        >
          {child}
        </LineTag>
      ))}
    </Tag>
  );
}

/** Total time in ms until the last of `count` rows has printed. */
export function terminalLinesDuration(
  count: number,
  { startDelay = 0, lineDelay = 80 } = {},
) {
  return startDelay + Math.max(0, count - 1) * lineDelay;
}

/** Time in ms until `TypedText` has finished typing `text`. */
export function typedTextDuration(
  text: string,
  { startDelay = 200, charDelay = 45 } = {},
) {
  return startDelay + Array.from(text).length * charDelay;
}
