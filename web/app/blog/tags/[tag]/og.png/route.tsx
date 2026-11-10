import { orPlaceholder, PLACEHOLDER_PARAM } from "@/lib/content/pagination";
import { getAllPosts } from "@/lib/content/posts";
import { BLOG_BASE, groupPostsByTag, tagHref } from "@/lib/content/tags";
import { pageCard, renderOgImage } from "@/lib/og";

// Static export: one PNG per tag page, out/blog/tags/<tag>/og.png. Pages 2..N
// of a tag reuse it (see app/blog/tags/[tag]/page/[n]/page.tsx).
export const dynamic = "force-static";
export const dynamicParams = false;

// Same params as the tag page, including its placeholder when there are no
// tags yet (output: "export" fails on an empty list).
export function generateStaticParams(): { tag: string }[] {
  return orPlaceholder(
    [...groupPostsByTag(getAllPosts()).keys()].map((tag) => ({ tag })),
    { tag: PLACEHOLDER_PARAM },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tag: string }> },
) {
  const { tag } = await params;
  const count = groupPostsByTag(getAllPosts()).get(tag)?.length ?? 0;
  // The placeholder page is a noindex 404 that nothing links to; give it the
  // tags card rather than failing the build.
  const card =
    count === 0
      ? pageCard({
          title: "Tags",
          subtitle: "Every tag used on Leo Levintza's blog.",
          path: `${BLOG_BASE}tags/`,
        })
      : pageCard({
          title: `#${tag}`,
          subtitle: `${count} ${count === 1 ? "post" : "posts"} by Leo Levintza tagged #${tag}.`,
          path: tagHref(tag),
        });
  return renderOgImage(card);
}
