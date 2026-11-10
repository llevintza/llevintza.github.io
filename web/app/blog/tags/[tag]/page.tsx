import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  orPlaceholder,
  paginate,
  PLACEHOLDER_PARAM,
} from "@/lib/content/pagination";
import { Pagination, PostList } from "@/lib/content/post-list";
import { getAllPosts } from "@/lib/content/posts";
import { groupPostsByTag, tagHref } from "@/lib/content/tags";
import { buildMetadata } from "@/lib/site/metadata";

type Props = PageProps<"/blog/tags/[tag]">;

// Static export: only tags used by a published post exist.
export const dynamicParams = false;

export function generateStaticParams(): { tag: string }[] {
  return orPlaceholder(
    [...groupPostsByTag(getAllPosts()).keys()].map((tag) => ({ tag })),
    { tag: PLACEHOLDER_PARAM },
  );
}

async function findTag(params: Props["params"]) {
  const { tag } = await params;
  const posts = groupPostsByTag(getAllPosts()).get(tag);
  const page = posts ? paginate(posts, 1, tagHref(tag)) : undefined;
  if (!page) notFound();
  return { tag, page, count: posts!.length };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await findTag(params);
  return buildMetadata({
    title: `Posts tagged #${tag}`,
    description: `Blog posts by Leo Levintza tagged #${tag}.`,
    path: tagHref(tag),
    image: "page",
  });
}

export default async function TagPage({ params }: Props) {
  const { tag, page, count } = await findTag(params);
  return (
    <main>
      <h1>Posts tagged #{tag}</h1>
      <p>
        {count} {count === 1 ? "post" : "posts"}
      </p>
      <PostList posts={page.items} />
      <Pagination page={page} />
    </main>
  );
}
