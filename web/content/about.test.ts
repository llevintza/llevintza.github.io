import { describe, expect, it } from "vitest";

import { about } from "./about";

describe("about.privacyNote", () => {
  // ADR 0002 amendment (2026-11-10): Umami Cloud runs in the US region, so the
  // note makes no claim about where the stats are stored.
  it("states what analytics runs and makes no data-region claim", () => {
    expect(about.privacyNote).toBe(
      "This site uses Umami, a cookie-free analytics service that stores no personal data.",
    );
    expect(about.privacyNote).not.toMatch(/\b(EU|US|Europe)\b/);
  });
});
