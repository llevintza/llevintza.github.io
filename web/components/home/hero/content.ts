/*
 * Hero copy. Public facts only, taken from the public profile README
 * (github.com/llevintza/llevintza): intro, tagline and the `## Building`
 * table. Keep this in sync with that README when it changes.
 *
 * Public-content rules: no phone number, no personal email, and private
 * repos appear by name only (never linked). The terminal panel renders no
 * links at all, so private entries are safe by construction.
 */

export const name = "Leo Levintza";

/** The README tagline, rendered as `--flag` lines under the name. */
export const tagline = [
  "principal-software-engineer",
  "distributed-systems --cloud-native-backends",
  "agentic-ai-tooling --ai-augmented-sdlc",
  'location="New York Metro Area"',
] as const;

export const intro =
  "I design and build distributed, cloud-native backend systems, most recently for buy-side firms: a quantitative hedge fund, a global alternative asset manager, and a large US asset manager. Lately I embed agentic AI tooling (Claude Code, GitHub Copilot CLI, Sourcegraph Cody) into the SDLC: legacy discovery, documentation, code-review agents, and evaluation frameworks for AI-assisted delivery.";

export type BuildingEntry = {
  /** Repo name, shown as text only. */
  repo: string;
  /** Current stage, from the README's "What" column. */
  status: string;
  /** Private repos are named, never linked. */
  private?: boolean;
};

/** Current projects, in the README's `## Building` order. */
export const building: readonly BuildingEntry[] = [
  {
    repo: "instrument-price-dashboard",
    status: "M1-M3 shipped",
    private: true,
  },
  { repo: "allocator-memo-builder", status: "MVP v0.1.0", private: true },
  { repo: "credit-desk-analytics", status: "phases 0-6 shipped" },
  { repo: "energlens", status: "zero-cost demo" },
  { repo: "hedge-fund-market-data", status: "phase 2", private: true },
  { repo: "unlistd", status: "early MVP" },
  { repo: "openswim", status: "phase 0" },
];

/** Published package line at the foot of the terminal panel. */
export const npmPackage = {
  name: "@llevintza/fastify-prometheus-metrics",
  version: "1.0.2",
  licence: "MIT",
} as const;

export const ctas = {
  projects: { href: "/projects/", label: "./projects" },
  bookCall: {
    href: "https://scheduler.zoom.us/llevintza/availability",
    label: "book-a-call",
  },
} as const;
