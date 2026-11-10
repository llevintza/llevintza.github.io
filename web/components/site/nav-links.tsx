"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";

import { NAV_ITEMS, isActive } from "./nav-items";

/**
 * The `./blog ./projects ./about` links. The current section is shown in
 * inverse video and marked `aria-current="page"`.
 */
export function NavLinks({
  layout,
  onNavigate,
}: {
  /** `bar`: inline tabs (desktop); `list`: full-width rows (phone menu). */
  layout: "bar" | "list";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <ul
      className={cn(
        layout === "bar" ? "flex items-center gap-1" : "flex flex-col",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "group/nav flex items-center font-mono text-sm lowercase no-underline",
                layout === "bar"
                  ? "min-h-9 px-2.5"
                  : "min-h-12 border-b border-dashed border-line px-4 sm:px-gutter",
                active
                  ? "inverse"
                  : "text-ink hover:bg-inverse-bg hover:text-inverse-ink",
                focusRing,
                layout === "list" && "focus-visible:-outline-offset-2",
              )}
            >
              <span
                aria-hidden="true"
                className={
                  active ? "" : "text-muted group-hover/nav:text-current"
                }
              >
                ./
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
