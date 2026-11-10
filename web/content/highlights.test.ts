import { describe, expect, it } from "vitest";

import { highlights, metrics } from "./highlights";

/*
 * The "Now" and "Selected work" lists, copied verbatim from the public
 * profile README (github.com/llevintza/llevintza). If the README changes,
 * update content/about.ts and these strings together.
 */
const README_NOW = [
  "Embedding agentic AI into the SDLC: code-review agents, agent evaluation frameworks, MCP servers and Claude Agent SDK pipelines",
  // The README says "(see Building)", its own section; the site points at
  // the Projects page instead, which shows the same Building table.
  "Founding and architecting open-source platforms in Go, TypeScript and Python (see Projects)",
];

const README_SELECTED_WORK = [
  "Cut legacy-system discovery on an undocumented investment-operations platform from 3-6 months to 6 weeks by embedding agentic AI tooling into the SDLC",
  "Decomposed a monolithic data-graph service on a major US retailer's e-commerce platform: 40% faster responses, 90% less CPU/memory, 50% lower operational cost",
  "Led an Apollo Federation GraphQL orchestration layer at Black Friday scale, working directly with Apollo's engineering team on scaling limits",
  "Built an F# Kafka-to-EventStore replication service sustaining 5,000 events/sec per instance on Docker and Nomad",
  "Built the observability and alerting stack (Splunk, Prometheus, Grafana, xMatters/PagerDuty) that cut SLA response from 30-45 to 10-15 minutes; retrofitted Datadog across a 100+ project .NET estate with zero code changes",
  "Built an OOXML reporting framework for a quantitative hedge fund that cut slide preparation time 100x",
];

describe("highlights", () => {
  it("Now matches the profile README", () => {
    const rendered = highlights.now.map(
      (line) => `${line.text}${line.link?.label ?? ""}${line.after ?? ""}`,
    );
    expect(rendered).toEqual(README_NOW);
  });

  it("Now links stay internal", () => {
    for (const line of highlights.now) {
      if (line.link) expect(line.link.href).toMatch(/^\/[^/]/);
    }
  });

  it("Selected work matches the profile README", () => {
    expect(highlights.selectedWork).toEqual(README_SELECTED_WORK);
  });

  it("every metric cites a real Selected work line", () => {
    for (const metric of metrics) {
      expect(README_SELECTED_WORK[metric.source]).toBeDefined();
    }
  });

  it.each(metrics.map((m) => [`${m.value} ${m.label}`, m] as const))(
    "%s quotes its source line verbatim",
    (_, metric) => {
      const line = README_SELECTED_WORK[metric.source];
      for (const part of [
        metric.value,
        metric.unit,
        metric.from,
        metric.label,
      ]) {
        if (part !== undefined) expect(line).toContain(part);
      }
    },
  );

  it("every number in a tile is stated in the README", () => {
    const readme = README_SELECTED_WORK.join("\n");
    for (const metric of metrics) {
      const text = [metric.from, metric.value, metric.unit, metric.label].join(
        " ",
      );
      for (const number of text.match(/\d[\d,.]*/g) ?? []) {
        expect(readme).toContain(number);
      }
    }
  });

  it("a line without numbers has no tile", () => {
    const apollo = README_SELECTED_WORK.findIndex((l) => l.includes("Apollo"));
    expect(metrics.some((m) => m.source === apollo)).toBe(false);
  });
});
