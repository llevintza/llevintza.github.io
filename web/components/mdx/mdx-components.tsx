import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Components used when rendering post MDX. Plain defaults for now: #8 styles
 * the prose, and #18 adds callouts and Mermaid diagrams here.
 */
export const mdxComponents: MDXComponents = {
  a: MdxLink,
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
