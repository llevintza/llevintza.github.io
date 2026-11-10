"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

import { THEMES, THEME_STORAGE_KEY } from "@/lib/theme/themes";

/**
 * Sets `data-theme="dark"|"light"` on <html> before first paint (an inline
 * script, so no flash), follows the system setting until the visitor picks
 * a theme, then remembers the choice in localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      themes={[...THEMES]}
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
