import Link from "next/link";

import type { Page } from "./pagination";
import type { PostMeta } from "./posts";
import { tagHref } from "./tags";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

function formatDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

/** One page of a post list (the blog index or a tag), newest first. */
export function PostList({ posts }: { posts: readonly PostMeta[] }) {
  if (posts.length === 0) {
    return <p>No posts yet.</p>;
  }
  return (
    <ol>
      {posts.map((post) => (
        <li key={post.slug}>
          <article>
            <h2>
              <Link href={post.permalink}>{post.title}</Link>
            </h2>
            <p>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {" · "}
              <span>{post.readingTime.minutes} min read</span>
              {post.draft ? " · Draft" : null}
            </p>
            {post.tags.length > 0 ? (
              <ul aria-label="Tags">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={tagHref(tag)}>#{tag}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <p>{post.summary}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}

/** Newer/older links. Renders nothing when everything fits on one page. */
export function Pagination({ page }: { page: Page<unknown> }) {
  if (page.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination">
      <ul>
        {page.prevHref ? (
          <li>
            <Link href={page.prevHref} rel="prev">
              ← Newer posts
            </Link>
          </li>
        ) : null}
        <li aria-current="page">
          Page {page.page} of {page.totalPages}
        </li>
        {page.nextHref ? (
          <li>
            <Link href={page.nextHref} rel="next">
              Older posts →
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
