/*
 * Home-page highlights (#13): "Now" and "Selected work".
 *
 * The text is `now` and `selectedWork` from `content/about.ts`, which mirror
 * the public profile README (github.com/llevintza/llevintza) word for word.
 * This module only adds metric tiles on top. Every part of a tile (value,
 * starting value, label) is a verbatim substring of the Selected work line
 * it cites, so a tile can never state a number the README doesn't.
 * `highlights.test.ts` enforces that.
 */

import { now, selectedWork, type RichLine } from "./about";

/** One highlight tile: a number from the README and what it measures. */
export type Metric = {
  /** The headline figure, e.g. "5,000" or "40%". */
  value: string;
  /** Optional unit set smaller after the value, e.g. "events/sec". */
  unit?: string;
  /** Optional "before" figure, shown as `from → value`. */
  from?: string;
  /** What the figure measures, quoted from the source line. */
  label: string;
  /** Index into `selectedWork` of the line this metric comes from. */
  source: number;
};

/**
 * The figures stated in the README's Selected work list, in its order.
 * The Apollo Federation line states no number, so it has no tile.
 */
export const metrics: readonly Metric[] = [
  {
    from: "3-6 months",
    value: "6 weeks",
    label: "legacy-system discovery",
    source: 0,
  },
  { value: "40%", label: "faster responses", source: 1 },
  { value: "90%", label: "less CPU/memory", source: 1 },
  { value: "50%", label: "lower operational cost", source: 1 },
  {
    value: "5,000",
    unit: "events/sec",
    label: "per instance",
    source: 3,
  },
  {
    from: "30-45",
    value: "10-15 minutes",
    label: "SLA response",
    source: 4,
  },
  { value: "100+", label: "project .NET estate", source: 4 },
  { value: "100x", label: "cut slide preparation time", source: 5 },
];

export type Highlights = {
  now: readonly RichLine[];
  selectedWork: readonly string[];
  metrics: readonly Metric[];
};

export const highlights: Highlights = { now, selectedWork, metrics };
