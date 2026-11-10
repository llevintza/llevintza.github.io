import Link from "next/link";

import { getAllTags } from "@/lib/content/posts";
import { BLOG_BASE, tagHref } from "@/lib/content/tags";
import { buildMetadata } from "@/lib/site/metadata";

import "@/lib/content/post-list.css";

export const metadata = buildMetadata({
  title: "Tags",
  description: "Every tag used on Leo Levintza's blog.",
  path: `${BLOG_BASE}tags/`,
});

export default function TagsPage() {
  const tags = getAllTags();
  return (
    <main>
      <h1>Tags</h1>
      {tags.length === 0 ? (
        <p>No tags yet.</p>
      ) : (
        <ul className="tag-list">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link href={tagHref(tag)}>#{tag}</Link> ({count})
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
