import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/components/ui/cn";

import styles from "./motion.module.css";
import { revealAttributes, revealStyle } from "./reveal-attributes";

type StaggerProps = {
  children: ReactNode;
  className?: string;
  /** Render the group as a list (`ul`/`ol`) so items can be `li`. */
  as?: "div" | "ul" | "ol";
  once?: boolean;
  amount?: number;
};

/**
 * Reveals its `<StaggerItem>` children one after another ("print" rhythm)
 * when the group scrolls into view. Same rules as `<Reveal>`: a Server
 * Component driven by CSS transitions and the page's `<ScrollReveal />`,
 * visible at rest, only below-the-fold groups animate, off under reduced
 * motion.
 */
export function Stagger({
  children,
  className,
  as: Tag = "div",
  once,
  amount,
}: StaggerProps) {
  let index = 0;
  return (
    <Tag
      className={cn(styles.stagger, className)}
      style={revealStyle}
      {...revealAttributes({ once, amount })}
    >
      {Children.map(children, (child) =>
        isValidElement(child) && child.type === StaggerItem
          ? cloneElement(child as ReactElement<StaggerItemProps>, {
              index: index++,
            })
          : child,
      )}
    </Tag>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  /** Use `li` inside `<Stagger as="ul">` or `as="ol"`. */
  as?: "div" | "li";
  /** Position in the group; set by `<Stagger>`. */
  index?: number;
};

/** One step of a `<Stagger>` group. */
export function StaggerItem({
  children,
  className,
  as: Tag = "div",
  index = 0,
}: StaggerItemProps) {
  return (
    <Tag
      className={cn(styles.staggerItem, className)}
      style={{ "--i": index } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
