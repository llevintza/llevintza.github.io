import type { ReactNode } from "react";

import { isAnalyticsEnabled } from "./config";

type PrivacyNoteProps = {
  children: ReactNode;
  className?: string;
  /** Defaults to isAnalyticsEnabled(); the prop exists for tests. */
  enabled?: boolean;
};

/** The analytics note renders only when analytics actually runs (#58). */
export function PrivacyNote({
  children,
  className,
  enabled = isAnalyticsEnabled(),
}: PrivacyNoteProps) {
  return enabled ? <p className={className}>{children}</p> : null;
}
