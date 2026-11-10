import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { Callout } from "./callout";
import { MdxImage } from "./mdx-image";

import "./mdx.css";

/**
 * Components used when rendering post MDX. #8 styles the prose; #18 adds
 * callouts, zoomable images, heading anchors and Mermaid diagrams (the last
 * two come from rehype plugins in lib/content/mdx.tsx, styled in mdx.css).
 */
export const mdxComponents: MDXComponents = {
  a: MdxLink,
  img: MdxImage,
  Callout,
};

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
