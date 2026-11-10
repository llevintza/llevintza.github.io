import type { HTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

import styles from "./prose.module.css";

/** Class name for long-form content, for wrappers that can't use <Prose>. */
export const proseClassName = styles.prose;

/**
 * Wraps MDX or other long-form content: headings with `##` markers, code
 * windows, scrollable tables, quotes and lists, in both themes (#60 §5).
 */
export function Prose({
  as: Tag = "div",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" }) {
  return <Tag className={cn(styles.prose, className)} {...props} />;
}
