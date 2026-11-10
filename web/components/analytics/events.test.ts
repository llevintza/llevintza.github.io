import { describe, expect, it } from "vitest";

import { outboundProjectEvent } from "./events";

describe("outboundProjectEvent", () => {
  it("builds the Umami data attributes for a project link", () => {
    expect(outboundProjectEvent("energlens", "live")).toEqual({
      "data-umami-event": "outbound-project",
      "data-umami-event-project": "energlens",
      "data-umami-event-target": "live",
    });
    expect(
      outboundProjectEvent("instrument-price-dashboard", "repo"),
    ).toMatchObject({ "data-umami-event-target": "repo" });
  });

  it("accepts repo-name characters", () => {
    expect(() =>
      outboundProjectEvent("llevintza.github.io", "repo"),
    ).not.toThrow();
    expect(() => outboundProjectEvent("a_b-c.d9", "repo")).not.toThrow();
  });

  it("rejects anything that isn't a repo-name slug", () => {
    for (const bad of [
      "",
      "two words",
      "someone@example.com",
      "https://example.com/",
      "a".repeat(101),
    ]) {
      expect(() => outboundProjectEvent(bad, "repo"), bad).toThrow(
        /Not a project slug/,
      );
    }
  });
});
