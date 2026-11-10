import { afterEach, describe, expect, it, vi } from "vitest";

import { analyticsWebsiteId, isAnalyticsEnabled } from "./config";

// Made-up ID; never commit a real one (it lives only in the Actions variable).
const FAKE_ID = "00000000-0000-0000-0000-000000000000";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAnalyticsEnabled", () => {
  it("is off without a website ID", () => {
    expect(isAnalyticsEnabled({ nodeEnv: "production" })).toBe(false);
    expect(isAnalyticsEnabled({ websiteId: "", nodeEnv: "production" })).toBe(
      false,
    );
    expect(
      isAnalyticsEnabled({ websiteId: "   ", nodeEnv: "production" }),
    ).toBe(false);
  });

  it("is off outside production builds", () => {
    expect(
      isAnalyticsEnabled({ websiteId: FAKE_ID, nodeEnv: "development" }),
    ).toBe(false);
    expect(isAnalyticsEnabled({ websiteId: FAKE_ID, nodeEnv: "test" })).toBe(
      false,
    );
  });

  it("is on for a production build with a website ID", () => {
    expect(
      isAnalyticsEnabled({ websiteId: FAKE_ID, nodeEnv: "production" }),
    ).toBe(true);
    expect(
      analyticsWebsiteId({ websiteId: ` ${FAKE_ID} `, nodeEnv: "production" }),
    ).toBe(FAKE_ID);
  });

  it("reads the website ID and NODE_ENV from the environment by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");
    expect(isAnalyticsEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", FAKE_ID);
    expect(isAnalyticsEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "development");
    expect(isAnalyticsEnabled()).toBe(false);
  });
});
