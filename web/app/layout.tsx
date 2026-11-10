import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  FEED_ALTERNATE_TYPES,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  TITLE_TEMPLATE,
} from "@/lib/site/metadata";
import { fontVariables } from "@/lib/theme/fonts";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: TITLE_TEMPLATE },
  description: SITE_DESCRIPTION,
  // Feed discovery on every page; buildMetadata repeats it for pages that set
  // their own `alternates`.
  alternates: { types: FEED_ALTERNATE_TYPES },
};

// Browser UI colour follows the system setting. The hex values must equal
// --bg in app/globals.css; `pnpm check:contrast` fails if they drift.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1118" },
    { media: "(prefers-color-scheme: light)", color: "#f7f9fb" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    // next-themes sets data-theme on <html> before hydration.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-prose text-ink">
        <ThemeProvider>
          {/* Temporary placement; the site header (#8) will own this. */}
          <div className="flex justify-end px-4 pt-4">
            <ThemeToggle />
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
