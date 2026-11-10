import Image from "next/image";

import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";

import { CONTACT_LINKS, ICONS_BASE } from "./contact-links";

/**
 * Site footer: copyright and the public contact links with the colored
 * email-icons set. No phone and no email, by rule.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto flex max-w-wrap flex-col gap-4 px-4 py-6 sm:px-gutter md:flex-row md:items-center md:justify-between">
        <p className="m-0 font-mono text-sm text-muted">
          © {year} Leo Levintza{" "}
          <span aria-hidden="true" className="ml-2 text-ok">
            exit 0
          </span>
        </p>

        <ul aria-label="Contact" className="flex flex-wrap gap-x-1 gap-y-1">
          {CONTACT_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={cn(
                  "group/contact flex min-h-9 items-center gap-2 px-2 font-mono text-sm text-ink no-underline hover:inverse",
                  focusRing,
                )}
              >
                {/* Some icons are black: give them a light tile in dark mode. */}
                <Image
                  src={`${ICONS_BASE}${link.icon}`}
                  alt=""
                  width={16}
                  height={16}
                  className="size-4 shrink-0 dark:box-content dark:bg-head dark:p-px"
                />
                {link.label}
                <span
                  aria-hidden="true"
                  className="text-muted group-hover/contact:text-current"
                >
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
