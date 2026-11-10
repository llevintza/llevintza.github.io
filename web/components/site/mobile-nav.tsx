"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type KeyboardEvent } from "react";

import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";

import { NavLinks } from "./nav-links";

/**
 * Phone navigation (#60 §5): a `menu` text button, no hamburger icon, that
 * opens a full-width list under the header. Built on <details>, so it works
 * with JS off; with JS it also closes on Escape and after navigating.
 */
export function MobileNav({ className }: { className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  // Close after a client-side navigation.
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  const onKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key === "Escape" && ref.current?.open) {
      close();
      ref.current.querySelector("summary")?.focus();
    }
  };

  return (
    <details ref={ref} onKeyDown={onKeyDown} className={cn("group", className)}>
      <summary
        className={cn(
          "flex min-h-9 cursor-pointer list-none items-center gap-1.5 border border-line bg-panel px-2.5 font-mono text-sm text-ink select-none [&::-webkit-details-marker]:hidden",
          "hover:border-inverse-bg hover:bg-inverse-bg hover:text-inverse-ink group-open:inverse group-open:border-inverse-bg",
          focusRing,
        )}
      >
        <span aria-hidden="true" className="w-[1ch] text-center">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">-</span>
        </span>
        menu
      </summary>
      <nav
        aria-label="Main"
        className="absolute inset-x-0 top-full z-40 border-b border-line bg-bg shadow-hard"
      >
        <NavLinks layout="list" onNavigate={close} />
      </nav>
    </details>
  );
}
