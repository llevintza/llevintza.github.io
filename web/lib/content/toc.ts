import { createProcessor } from "@mdx-js/mdx";
import type { Element, Root } from "hast";
import { toString } from "hast-util-to-string";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

/** One table-of-contents entry: an h2 or h3 of the post. */
export interface TocEntry {
  /** 2 for h2, 3 for h3. */
  depth: 2 | 3;
  /** The heading's `id`, as rehype-slug assigns it in the rendered post. */
  id: string;
  /** Plain text of the heading. */
  text: string;
}

/** Posts with more headings than this get a table of contents. */
export const TOC_MIN_HEADINGS = 3;

/** True when a post is long enough to show its table of contents. */
export function shouldShowToc(toc: readonly TocEntry[]): boolean {
  return toc.length > TOC_MIN_HEADINGS;
}

/**
 * Lists the h2 and h3 headings of an MDX body, in document order.
 *
 * Runs the same remark plugins and rehype-slug as `renderMdx`, on the same
 * tree, so each `id` matches the rendered heading exactly (including the
 * `-1`, `-2` suffixes rehype-slug gives duplicates, which count every heading
 * level, not just h2/h3).
 */
export async function extractToc(body: string): Promise<TocEntry[]> {
  const entries: TocEntry[] = [];

  const collect = () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "h2" && node.tagName !== "h3") return;
      const id = node.properties.id;
      const text = toString(node).trim();
      if (typeof id !== "string" || !text) return;
      entries.push({ depth: node.tagName === "h2" ? 2 : 3, id, text });
    });
  };

  const processor = createProcessor({
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, collect],
  });
  // Compiling to JS is wasted work, but it is cheap and keeps the types simple.
  await processor.process(body);
  return entries;
}
