// Umami Cloud analytics (ADR 0002, #58). Cookie-free: the script stores
// nothing on the device and only reads Umami's own opt-out flag.
//
// Inert by default. The script renders only when NEXT_PUBLIC_UMAMI_WEBSITE_ID
// is set at build time, and only the Pages deploy build gets that Actions
// variable; CI, Lighthouse, e2e and PR builds render nothing. The website ID is
// a public identifier, but it lives only in the variable, never in git.

import { analyticsWebsiteId } from "./config";

export const UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js";
/** Only this host reports, so forks and local previews of a build stay silent. */
export const UMAMI_DOMAINS = "llevintza.github.io";

type UmamiProps = {
  /** Defaults to NEXT_PUBLIC_UMAMI_WEBSITE_ID, inlined by `next build`. */
  websiteId?: string;
  /** Defaults to NODE_ENV; anything but "production" (e.g. `next dev`) renders nothing. */
  nodeEnv?: string;
};

/** Renders only when isAnalyticsEnabled() holds (see ./config.ts). */
export function Umami({ websiteId, nodeEnv }: UmamiProps) {
  const id = analyticsWebsiteId({ websiteId, nodeEnv });
  if (!id) return null;

  return (
    <script
      defer
      src={UMAMI_SCRIPT_SRC}
      data-website-id={id}
      data-domains={UMAMI_DOMAINS}
      data-do-not-track="true"
    />
  );
}
