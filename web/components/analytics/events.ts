// Umami custom events (ADR 0002 step 5, #58). Plain data attributes: they do
// nothing unless the Umami script is on the page (see ./config.ts).
//
// Keep names and values stable and low-cardinality, and never put personal
// data in them: a project is its repo name, a target is "repo" or "live".

export const OUTBOUND_PROJECT_EVENT = "outbound-project";

export type OutboundTarget = "repo" | "live";

export type OutboundProjectEventAttributes = {
  "data-umami-event": typeof OUTBOUND_PROJECT_EVENT;
  "data-umami-event-project": string;
  "data-umami-event-target": OutboundTarget;
};

/** A repo name: letters, digits, `.`, `_` and `-` only. */
const PROJECT_SLUG = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Attributes for an outbound project link, spread onto the `<a>`:
 * `<a href={url} {...outboundProjectEvent("energlens", "live")}>`.
 * Throws on anything but a repo-name slug, so free text can't leak in.
 */
export function outboundProjectEvent(
  project: string,
  target: OutboundTarget,
): OutboundProjectEventAttributes {
  if (!PROJECT_SLUG.test(project)) {
    throw new Error(`Not a project slug: ${JSON.stringify(project)}`);
  }
  return {
    "data-umami-event": OUTBOUND_PROJECT_EVENT,
    "data-umami-event-project": project,
    "data-umami-event-target": target,
  };
}
