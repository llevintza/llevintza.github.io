/*
 * Hero copy. Public facts only, taken from the public profile README
 * (github.com/llevintza/llevintza): intro, tagline and the `## Building`
 * table. Keep this in sync with that README when it changes.
 *
 * Public-content rules: no phone number, no personal email, and private
 * repos appear by name only (never linked). The terminal panel renders no
 * links at all, so private entries are safe by construction.
 */

import { about } from "@/content/about";
import { featuredProjects } from "@/content/featured";

export const name = about.name;

/** The README headline (`about.headline`) as `--flag` lines under the name. */
export const tagline = [
  "principal-software-engineer",
  "distributed-systems --cloud-native-backends",
  "agentic-ai-tooling --ai-augmented-sdlc",
  'location="New York Metro Area"',
] as const;

export const headline = about.headline;
export const intro = about.bio;

export type BuildingEntry = {
  /** Repo name, shown as text only. */
  repo: string;
  /** Current stage, short form of the README's "What" column. */
  status: string;
  /** Private repos are named, never linked. */
  private: boolean;
};

/**
 * Short stage labels for the terminal panel, keyed by featured project name.
 * The rows themselves (which repos, their order and privacy) come from
 * `content/featured.ts` (Arch A67-01): a project shows in the panel when it
 * has a stage here. aws-fastify-prometheus appears as the npm line below;
 * the smaller tools (claude-codebase-agent, aws-config-service) are left to
 * the projects page to keep the panel short on phones.
 */
export const panelStages: Readonly<Record<string, string>> = {
  "instrument-price-dashboard": "M1-M3 shipped",
  "allocator-memo-builder": "MVP v0.1.0",
  "credit-desk-analytics": "phases 0-6 shipped",
  energlens: "zero-cost demo",
  "hedge-fund-market-data": "phase 2",
  unlistd: "early MVP",
  openswim: "phase 0",
};

export const building: readonly BuildingEntry[] = featuredProjects.flatMap(
  (project) => {
    const status = panelStages[project.name];
    return status
      ? [{ repo: project.name, status, private: project.access === "private" }]
      : [];
  },
);

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
