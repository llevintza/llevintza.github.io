import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

/**
 * Cards are "windows" (#60 §5): a Departure Mono title bar on --panel-2, a
 * 1px --line frame, the body on --panel and a hard shadow. No radius and no
 * hover lift; hover (or keyboard focus on the card's link) inverts the title
 * bar instead.
 *
 *   <Card>
 *     <CardBar>posts/2026-11-09-hello.md</CardBar>
 *     <CardBody>
 *       <CardTitle href="/blog/...">Hello</CardTitle>
 *       <CardMeta>2026-11-09 · 4 min</CardMeta>
 *       <p>Excerpt…</p>
 *     </CardBody>
 *     <CardFooter><TagList tags={["nextjs"]} /></CardFooter>
 *   </Card>
 *
 * With a `CardTitle href`, the whole card is clickable (a stretched link)
 * and shows the focus ring around the whole window.
 */
export function Card({
  as: Tag = "article",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "article" | "section" | "div" | "li";
}) {
  return (
    <Tag
      className={cn(
        "group/card relative flex flex-col border border-line bg-panel text-ink shadow-hard",
        // Focus ring on the window when its main link has keyboard focus.
        "has-[[data-card-link]:focus-visible]:outline-2 has-[[data-card-link]:focus-visible]:outline-offset-2 has-[[data-card-link]:focus-visible]:outline-ring",
        className,
      )}
      {...props}
    />
  );
}

/** The window title bar: a file name or path, decorative chrome. */
export function CardBar({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  /** Optional right-aligned text, e.g. a status or a language. */
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-8 items-center gap-3 border-b border-line bg-panel-2 px-3 py-1.5 font-pixel text-chrome text-ink",
        "group-hover/card:bg-inverse-bg group-hover/card:text-inverse-ink",
        "group-has-[[data-card-link]:focus-visible]/card:bg-inverse-bg group-has-[[data-card-link]:focus-visible]/card:text-inverse-ink",
        className,
      )}
    >
      <span aria-hidden="true" className="flex gap-1">
        <i className="block size-[7px] border border-current" />
        <i className="block size-[7px] border border-current" />
      </span>
      <span className="min-w-0 truncate">{children}</span>
      {aside != null && <span className="ml-auto shrink-0">{aside}</span>}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-3 p-4 sm:p-5 [&>*]:m-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The card heading. With `href` it holds the card's main link, which is
 * stretched over the whole card so the window is one click target.
 */
export function CardTitle({
  as: Heading = "h3",
  href,
  className,
  children,
}: {
  as?: "h2" | "h3" | "h4";
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Heading
      className={cn(
        "m-0 font-mono text-lg leading-snug font-semibold text-head",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          data-card-link=""
          className="text-head no-underline decoration-1 underline-offset-[0.2em] outline-none group-hover/card:underline after:absolute after:inset-0 after:content-['']"
        >
          {children}
        </Link>
      ) : (
        children
      )}
    </Heading>
  );
}

/** Meta line (date, reading time, status) in muted micro mono. */
export function CardMeta({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "m-0 font-mono text-micro text-muted tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Footer row (tags, links). Raised above the stretched link so links in it
 * stay separately clickable.
 */
export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative z-10 flex flex-wrap items-center gap-3 border-t border-dashed border-line px-4 py-3 sm:px-5",
        className,
      )}
      {...props}
    />
  );
}
