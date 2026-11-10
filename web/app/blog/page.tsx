import { notFound } from "next/navigation";

import { paginate } from "@/lib/content/pagination";
import { Pagination, PostList } from "@/lib/content/post-list";
import { getAllPosts } from "@/lib/content/posts";
import { buildMetadata } from "@/lib/site/metadata";
import { BLOG_BASE } from "@/lib/content/tags";

export const metadata = buildMetadata({
  title: "Blog",
  description: "Posts by Leo Levintza, newest first.",
  path: BLOG_BASE,
  image: "page",
});

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
