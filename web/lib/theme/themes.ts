/** Theme names, matching `data-theme` on <html> (set by next-themes). */
export const THEMES = ["dark", "light"] as const;
export type ThemeName = (typeof THEMES)[number];

/** localStorage key next-themes uses to remember a manual choice. */
export const THEME_STORAGE_KEY = "theme";
