import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Umami } from "./umami";

// Made-up ID; never commit a real one (it lives only in the Actions variable).
const FAKE_ID = "00000000-0000-0000-0000-000000000000";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Umami", () => {
  it("renders nothing without a website ID", () => {
    expect(renderToStaticMarkup(<Umami nodeEnv="production" />)).toBe("");
    expect(
      renderToStaticMarkup(<Umami websiteId="" nodeEnv="production" />),
    ).toBe("");
    expect(
      renderToStaticMarkup(<Umami websiteId="   " nodeEnv="production" />),
    ).toBe("");
  });

  it("renders nothing outside production builds", () => {
    expect(
      renderToStaticMarkup(<Umami websiteId={FAKE_ID} nodeEnv="development" />),
    ).toBe("");
  });

  it("renders the deferred Umami script with a website ID", () => {
    const html = renderToStaticMarkup(
      <Umami websiteId={FAKE_ID} nodeEnv="production" />,
    );
    expect(html).toBe(
      `<script defer="" src="https://cloud.umami.is/script.js" data-website-id="${FAKE_ID}" data-domains="llevintza.github.io" data-do-not-track="true"></script>`,
    );
  });

  it("reads the website ID and NODE_ENV from the environment by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");
    expect(renderToStaticMarkup(<Umami />)).toBe("");

    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", FAKE_ID);
    expect(renderToStaticMarkup(<Umami />)).toContain(
      `data-website-id="${FAKE_ID}"`,
    );
  });
});
