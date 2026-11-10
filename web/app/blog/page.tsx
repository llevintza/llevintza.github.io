import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { paginate } from "@/lib/content/pagination";
import { Pagination, PostList } from "@/lib/content/post-list";
import { getAllPosts } from "@/lib/content/posts";
import { BLOG_BASE } from "@/lib/content/tags";

const SITE_URL = "https://llevintza.github.io";

export const metadata: Metadata = {
  title: "Blog",
  description: "Posts by Leo Levintza, newest first.",
  alternates: { canonical: new URL(BLOG_BASE, SITE_URL).href },
};

export default function BlogPage() {
  const page = paginate(getAllPosts(), 1, BLOG_BASE);
  if (!page) notFound();

  return (
    <main>
      <h1>Blog</h1>
      <PostList posts={page.items} />
      <Pagination page={page} />
    </main>
  );
}
