import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  extraPageNumbers,
  orPlaceholder,
  paginate,
  pageHref,
  parsePageParam,
  PLACEHOLDER_PARAM,
  type Page,
} from "@/lib/content/pagination";
import { Pagination, PostList } from "@/lib/content/post-list";
import { getAllPosts, type Post } from "@/lib/content/posts";
import { BLOG_BASE } from "@/lib/content/tags";
import { ogImagePath } from "@/lib/og";
import { buildMetadata } from "@/lib/site/metadata";

type Props = PageProps<"/blog/page/[n]">;

// Static export: only pages 2..N exist. Page 1 is /blog/.
export const dynamicParams = false;

export function generateStaticParams(): { n: string }[] {
  return orPlaceholder(
    extraPageNumbers(getAllPosts().length).map((n) => ({ n: String(n) })),
    { n: PLACEHOLDER_PARAM },
  );
}

async function findPage(params: Props["params"]): Promise<Page<Post>> {
  const { n } = await params;
  const number = parsePageParam(n);
  const page = number ? paginate(getAllPosts(), number, BLOG_BASE) : undefined;
  if (!page) notFound();
  return page;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await findPage(params);
  return buildMetadata({
    title: `Blog, page ${page.page}`,
    description: `Posts by Leo Levintza, page ${page.page} of ${page.totalPages}.`,
    path: pageHref(BLOG_BASE, page.page),
    // Later pages share the blog index card.
    image: { path: ogImagePath(BLOG_BASE), alt: "Blog · Leo Levintza" },
  });
}

export default async function BlogPageN({ params }: Props) {
  const page = await findPage(params);
  return (
    <main>
      <h1>
        Blog <small>page {page.page}</small>
      </h1>
      <PostList posts={page.items} />
      <Pagination page={page} />
    </main>
  );
}
