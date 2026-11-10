import Image from "next/image";

import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";
import { contactLinks } from "@/content/contact";

/**
 * Site footer: copyright and the public contact links from
 * `content/contact.ts`, with their colour icons. No phone and no email, by
 * rule.
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
          {contactLinks.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                className={cn(
                  "group/contact flex min-h-9 items-center gap-2 px-2 font-mono text-sm text-ink no-underline hover:inverse",
                  focusRing,
                )}
              >
                {/* Black logos get a light chip in dark mode. */}
                <Image
                  src={link.icon}
                  alt=""
                  width={16}
                  height={16}
                  className={cn(
                    "size-4 shrink-0",
                    link.darkIcon &&
                      "dark:box-content dark:bg-(--contact-chip) dark:p-px",
                  )}
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
