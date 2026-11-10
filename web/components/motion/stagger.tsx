"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

import { duration, ease, revealOffset, staggerStep } from "./tokens";
import { useRevealOnScroll } from "./use-reveal-on-scroll";

const groupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: staggerStep } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: revealOffset / 2, transition: { duration: 0 } },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease } },
};

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
 * when the group scrolls into view. Same rules as `<Reveal>`: visible at
 * rest, only below-the-fold groups animate, off under reduced motion.
 */
export function Stagger({
  children,
  className,
  as = "div",
  once,
  amount,
}: StaggerProps) {
  const { ref, phase, reduce } = useRevealOnScroll<HTMLElement>({
    once,
    amount,
  });

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      ref={ref as never}
      className={className}
      initial={false}
      animate={phase}
      variants={groupVariants}
    >
      {children}
    </MotionTag>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  /** Use `li` inside `<Stagger as="ul">` or `as="ol"`. */
  as?: "div" | "li";
};

/** One step of a `<Stagger>` group. */
export function StaggerItem({
  children,
  className,
  as = "div",
}: StaggerItemProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  const MotionTag = motion[as];
  return (
    <MotionTag className={className} variants={itemVariants}>
      {children}
    </MotionTag>
  );
}
