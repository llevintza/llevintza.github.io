import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TagList } from "@/components/ui/tag";
import { renderMdx } from "@/lib/content/mdx";
import {
  getAllPosts,
  getPostBySlug,
  type Post,
  type PostParams,
} from "@/lib/content/posts";

import "../../../../shiki.css";

const SITE_URL = "https://llevintza.github.io";

type Props = PageProps<"/blog/[year]/[month]/[day]/[slug]">;

// Static export: only the permalinks listed below exist.
export const dynamicParams = false;

export function generateStaticParams(): PostParams[] {
  return getAllPosts().map((post) => post.params);
}

async function findPost(params: Props["params"]): Promise<Post> {
  const { year, month, day, slug } = await params;
  const post = getPostBySlug(slug);
  if (
    !post ||
    post.params.year !== year ||
    post.params.month !== month ||
    post.params.day !== day
  ) {
    notFound();
  }
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await findPost(params);
  return {
    title: post.title,
    description: post.summary,
    // Absolute, because the root layout has no `metadataBase` yet (#29).
    alternates: { canonical: new URL(post.permalink, SITE_URL).href },
  };
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export default async function PostPage({ params }: Props) {
  const post = await findPost(params);
  const content = await renderMdx(post.body);

  return (
    <main>
      <article>
        <header>
          <h1>{post.title}</h1>
          <p>
            <time dateTime={post.date}>
              {dateFormat.format(new Date(`${post.date}T00:00:00Z`))}
            </time>
            {" · "}
            <span>{post.readingTime.minutes} min read</span>
            {post.draft ? " · Draft" : null}
          </p>
          <TagList tags={post.tags} />
        </header>
        {content}
      </article>
    </main>
  );
}
