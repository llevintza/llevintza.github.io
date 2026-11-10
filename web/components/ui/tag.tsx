import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "./cn";
import { focusRing } from "./focus";

export type TagVariant = "chip" | "bracket";

const variants: Record<TagVariant, string> = {
  // Small inverse-video chip: `#nextjs`.
  chip: "inverse px-1.5 py-0.5",
  // Bracketed text on the page: `[nextjs]`.
  bracket: "text-muted",
};

const interactive: Record<TagVariant, string> = {
  chip: "hover:bg-panel-2 hover:text-head hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-line",
  bracket: "hover:inverse",
};

export type TagProps = {
  children: ReactNode;
  variant?: TagVariant;
  /** Makes the tag a link (e.g. to a tag listing). */
  href?: string;
  className?: string;
};

/**
 * A label in lowercase mono, never pill-shaped (#60 §5). Chips get a `#`
 * prefix and brackets wrap the bracket variant; both are decorative.
 */
export function Tag({ children, variant = "chip", href, className }: TagProps) {
  const classes = cn(
    "inline-flex items-baseline font-mono text-micro font-normal lowercase leading-none tracking-normal whitespace-nowrap no-underline",
    variants[variant],
    href && interactive[variant],
    href && focusRing,
    className,
  );
  const content =
    variant === "bracket" ? (
      <>
        <span aria-hidden="true">[</span>
        {children}
        <span aria-hidden="true">]</span>
      </>
    ) : (
      <>
        <span aria-hidden="true">#</span>
        {children}
      </>
    );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return <span className={classes}>{content}</span>;
}

/** A wrapped, unmarked list of tags. */
export function TagList({
  tags,
  variant,
  hrefFor,
  label = "Tags",
  className,
}: {
  tags: readonly string[];
  variant?: TagVariant;
  /** Builds a link per tag; omit for plain labels. */
  hrefFor?: (tag: string) => string;
  /** Accessible name for the list. */
  label?: string;
  className?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <li key={tag} className="flex">
          <Tag variant={variant} href={hrefFor?.(tag)}>
            {tag}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
