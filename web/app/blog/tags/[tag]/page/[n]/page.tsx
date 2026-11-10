import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  extraPageNumbers,
  orPlaceholder,
  paginate,
  pageHref,
  parsePageParam,
  PLACEHOLDER_PARAM,
} from "@/lib/content/pagination";
import { Pagination, PostList } from "@/lib/content/post-list";
import { getAllPosts } from "@/lib/content/posts";
import { groupPostsByTag, tagHref } from "@/lib/content/tags";

const SITE_URL = "https://llevintza.github.io";

type Props = PageProps<"/blog/tags/[tag]/page/[n]">;

// Static export: only pages 2..N of tags with more than one page exist.
export const dynamicParams = false;

export function generateStaticParams(): { tag: string; n: string }[] {
  return orPlaceholder(
    [...groupPostsByTag(getAllPosts())].flatMap(([tag, posts]) =>
      extraPageNumbers(posts.length).map((n) => ({ tag, n: String(n) })),
    ),
    { tag: PLACEHOLDER_PARAM, n: PLACEHOLDER_PARAM },
  );
}

async function findPage(params: Props["params"]) {
  const { tag, n } = await params;
  const number = parsePageParam(n);
  const posts = groupPostsByTag(getAllPosts()).get(tag);
  const page =
    posts && number ? paginate(posts, number, tagHref(tag)) : undefined;
  if (!page) notFound();
  return { tag, page };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag, page } = await findPage(params);
  return {
    title: `Posts tagged #${tag}, page ${page.page}`,
    description: `Blog posts by Leo Levintza tagged #${tag}, page ${page.page} of ${page.totalPages}.`,
    alternates: {
      canonical: new URL(pageHref(tagHref(tag), page.page), SITE_URL).href,
    },
  };
}

export default async function TagPageN({ params }: Props) {
  const { tag, page } = await findPage(params);
  return (
    <main>
      <h1>
        Posts tagged #{tag} <small>page {page.page}</small>
      </h1>
      <PostList posts={page.items} />
      <Pagination page={page} />
    </main>
  );
}
