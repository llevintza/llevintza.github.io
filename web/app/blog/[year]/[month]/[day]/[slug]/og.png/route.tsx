import { notFound } from "next/navigation";

import {
  getAllPosts,
  getPostBySlug,
  type PostParams,
} from "@/lib/content/posts";
import { postCard, renderOgImage } from "@/lib/og";

// Static export: one PNG per published post, next to its index.html.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): PostParams[] {
  return getAllPosts().map((post) => post.params);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<PostParams> },
) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  return renderOgImage(postCard(post));
}
