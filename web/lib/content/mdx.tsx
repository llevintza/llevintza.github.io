import { evaluate } from "@mdx-js/mdx";
import rehypeShiki, { type RehypeShikiOptions } from "@shikijs/rehype";
import type { ReactElement } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";

import { mdxComponents } from "@/components/mdx/mdx-components";

/**
 * Both themes are emitted as CSS variables (`--shiki-light`, `--shiki-dark`);
 * `app/blog/shiki.css` picks one from `data-theme` on `<html>`.
 */
const shikiOptions: RehypeShikiOptions = {
  themes: { light: "github-light-default", dark: "github-dark-default" },
  defaultColor: false,
};

/**
 * Compiles and runs an MDX body at build time, in a server component, and
 * returns the rendered element. Post content is trusted (it lives in the
 * repo), so evaluating it is fine.
 */
export async function renderMdx(body: string): Promise<ReactElement> {
  const { default: Content } = await evaluate(body, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [[rehypeShiki, shikiOptions]],
  });
  return <Content components={mdxComponents} />;
}
