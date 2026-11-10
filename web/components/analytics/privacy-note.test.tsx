import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrivacyNote } from "./privacy-note";

const FAKE_ID = "00000000-0000-0000-0000-000000000000";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PrivacyNote", () => {
  it("renders nothing while analytics is off", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");
    expect(renderToStaticMarkup(<PrivacyNote>Uses Umami.</PrivacyNote>)).toBe(
      "",
    );
  });

  it("renders the note when analytics runs", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", FAKE_ID);
    expect(
      renderToStaticMarkup(
        <PrivacyNote className="text-sm">Uses Umami.</PrivacyNote>,
      ),
    ).toBe('<p class="text-sm">Uses Umami.</p>');
  });

  it("follows an explicit enabled prop", () => {
    expect(
      renderToStaticMarkup(<PrivacyNote enabled={false}>x</PrivacyNote>),
    ).toBe("");
    expect(renderToStaticMarkup(<PrivacyNote enabled>x</PrivacyNote>)).toBe(
      "<p>x</p>",
    );
  });
});
