import type { ReactNode } from "react";

export type CalloutType = "note" | "tip" | "warn";

const CALLOUTS: Record<CalloutType, { label: string; glyph: string }> = {
  note: { label: "note", glyph: "i" },
  tip: { label: "tip", glyph: "+" },
  warn: { label: "warning", glyph: "!" },
};

export interface CalloutProps {
  type?: CalloutType;
  /** Optional heading shown in the title bar after the type. */
  title?: string;
  children: ReactNode;
}

/**
 * `<Callout type="note|tip|warn" title="...">` in MDX: a terminal-style
 * window (spec #60) with the type in the title bar. The type is real text,
 * not colour alone, so it reaches screen readers and high-contrast modes.
 */
export function Callout({ type = "note", title, children }: CalloutProps) {
  const { label, glyph } = CALLOUTS[type] ?? CALLOUTS.note;
  return (
    <div className={`mdx-callout mdx-callout--${type}`} role="note">
      <p className="mdx-callout__bar">
        <span className="mdx-callout__glyph" aria-hidden="true">
          [{glyph}]
        </span>{" "}
        <span className="mdx-callout__label">{label}</span>
        {title ? (
          <>
            <span aria-hidden="true"> · </span>
            <span className="mdx-callout__title">
              <span className="sr-only">: </span>
              {title}
            </span>
          </>
        ) : null}
      </p>
      <div className="mdx-callout__body">{children}</div>
    </div>
  );
}
