// When analytics runs (ADR 0002, #58). One condition, shared by the Umami
// script and anything that talks about analytics (the About page's privacy
// note), so the site never claims analytics it doesn't run.

type AnalyticsEnv = {
  /** Defaults to NEXT_PUBLIC_UMAMI_WEBSITE_ID, inlined by `next build`. */
  websiteId?: string;
  /** Defaults to NODE_ENV; anything but "production" (e.g. `next dev`) is off. */
  nodeEnv?: string;
};

/** The trimmed Umami website ID, or undefined when analytics is off. */
export function analyticsWebsiteId({
  websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  nodeEnv = process.env.NODE_ENV,
}: AnalyticsEnv = {}): string | undefined {
  const id = websiteId?.trim();
  return id && nodeEnv === "production" ? id : undefined;
}

/** True only for a production build with a non-empty website ID. */
export function isAnalyticsEnabled(env: AnalyticsEnv = {}): boolean {
  return analyticsWebsiteId(env) !== undefined;
}
