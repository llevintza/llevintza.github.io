import Link from "next/link";

import { focusRing } from "@/components/ui/focus";
import { cn } from "@/components/ui/cn";

/**
 * A home-section heading in the console style: `## Title`, a muted path
 * such as `~/now`, and an optional `ls -a →` style link on the right.
 */
export function SectionHead({
  id,
  title,
  path,
  link,
}: {
  id: string;
  title: string;
  /** Decorative shell path next to the title, hidden on phones. */
  path?: string;
  link?: { href: string; label: string; srLabel: string };
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <h2 id={id} className="heading-marker m-0">
        {title}
      </h2>
      {path ? (
        <span
          aria-hidden="true"
          className="hidden font-mono text-sm text-muted sm:inline"
        >
          {path}
        </span>
      ) : null}
      {link ? (
        <Link
          href={link.href}
          className={cn(
            "ml-auto inline-flex min-h-6 items-center font-mono text-sm whitespace-nowrap",
            focusRing,
          )}
        >
          <span aria-hidden="true">{link.label}</span>
          <span className="sr-only">{link.srLabel}</span>
        </Link>
      ) : null}
    </div>
  );
}
