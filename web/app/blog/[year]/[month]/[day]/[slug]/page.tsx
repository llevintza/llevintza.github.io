import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { renderMdx } from "@/lib/content/mdx";
import {
  getAllPosts,
  getPostBySlug,
  type Post,
  type PostParams,
} from "@/lib/content/posts";

import "../../../../shiki.css";

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
    alternates: { canonical: post.permalink },
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
          {post.tags.length > 0 ? (
            <ul aria-label="Tags">
              {post.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
        </header>
        {content}
      </article>
    </main>
  );
}
