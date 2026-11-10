import type { Metadata } from "next";
import Link from "next/link";

import { getAllTags } from "@/lib/content/posts";
import { BLOG_BASE, tagHref } from "@/lib/content/tags";

const SITE_URL = "https://llevintza.github.io";

export const metadata: Metadata = {
  title: "Tags",
  description: "Every tag used on Leo Levintza's blog.",
  alternates: { canonical: new URL(`${BLOG_BASE}tags/`, SITE_URL).href },
};

export default function TagsPage() {
  const tags = getAllTags();
  return (
    <main>
      <h1>Tags</h1>
      {tags.length === 0 ? (
        <p>No tags yet.</p>
      ) : (
        <ul>
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
