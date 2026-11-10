import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { contactLinks } from "@/content/contact";

import { SiteFooter } from "./footer";

const CHIP = "dark:bg-(--contact-chip)";

/** The footer's contact anchors, with their icon's src and class. */
function renderLinks() {
  const html = renderToStaticMarkup(<SiteFooter />);
  return [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)].map(
    ([, href, inner]) => ({
      href,
      src: /<img[^>]* src="([^"]+)"/.exec(inner)?.[1],
      imgClass: /<img[^>]* class="([^"]*)"/.exec(inner)?.[1] ?? "",
    }),
  );
}

describe("SiteFooter", () => {
  it("lists every contact link from content/contact.ts, in order", () => {
    const links = renderLinks();
    expect(links.map((link) => link.href)).toEqual(
      contactLinks.map((link) => link.href),
    );
    // next/image may route the src through its loader in tests (no
    // next.config here), so match the decoded icon path.
    for (const [index, link] of contactLinks.entries()) {
      expect(decodeURIComponent(links[index].src ?? ""), link.id).toContain(
        link.icon,
      );
    }
  });

  it("puts the dark-mode chip only behind dark icons", () => {
    const links = renderLinks();
    for (const [index, link] of contactLinks.entries()) {
      expect(links[index].imgClass.includes(CHIP), link.id).toBe(link.darkIcon);
    }
  });
});
