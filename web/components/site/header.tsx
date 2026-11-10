import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

/**
 * Site header (#60 §5): one 1px rule below, no blur. The brand is a shell
 * prompt, the nav is lowercase mono (`./blog`), and on phones the nav
 * collapses into a `menu` button.
 */
export function SiteHeader() {
  return (
    <header className="relative z-30 border-b border-line bg-bg">
      <div className="mx-auto flex min-h-14 max-w-wrap items-center gap-3 px-4 sm:gap-6 sm:px-gutter">
        <Link
          href="/"
          aria-label="Leo Levintza, home"
          className={cn(
            "flex min-h-9 items-center font-mono text-base font-semibold whitespace-nowrap text-head no-underline hover:inverse",
            focusRing,
          )}
        >
          <span aria-hidden="true">
            <span className="text-accent">~/</span>leo{" "}
            <span className="font-normal text-muted">$</span>
            {/* Static block cursor; blinking is #9's job. */}
            <span className="ml-[0.4ch] inline-block h-[1.1em] w-[0.6em] bg-accent align-[-0.2em]" />
          </span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <NavLinks layout="bar" />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <MobileNav className="md:hidden" />
        </div>
      </div>
    </header>
  );
}
