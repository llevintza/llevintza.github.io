import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { Callout } from "./callout";
import { MdxImage } from "./mdx-image";

import "./mdx.css";

/**
 * Components used when rendering post MDX. #8 styles the prose; #18 adds
 * callouts, zoomable images, scrollable tables, heading anchors and Mermaid diagrams (the last
 * two come from rehype plugins in lib/content/mdx.tsx, styled in mdx.css).
 */
export const mdxComponents: MDXComponents = {
  a: MdxLink,
  img: MdxImage,
  table: MdxTable,
  Callout,
};

/**
 * Tables scroll sideways inside a labelled region that keyboard users can
 * focus and scroll with the arrow keys (WCAG 2.1.1, axe
 * scrollable-region-focusable), instead of widening the page on phones.
 */
function MdxTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="mdx-table" role="region" aria-label="Table" tabIndex={0}>
      <table {...props} />
    </div>
  );
}

/** Internal links (not protocol-relative `//host`) go through next/link; external ones open as usual. */
function MdxLink({ href = "", ...props }: ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return <Link href={href} {...props} />;
  }
  const external = /^(https?:)?\/\//.test(href);
  return (
    <a
      href={href}
      {...(external ? { rel: "noopener noreferrer" } : {})}
      {...props}
    />
  );
}
