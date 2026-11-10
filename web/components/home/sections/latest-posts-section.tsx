import Link from "next/link";

import { Stagger, StaggerItem } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";
import type { PostMeta } from "@/lib/content/posts";
import { BLOG_BASE } from "@/lib/content/tags";

import { SectionHead } from "./section-head";

/** How many posts the home page lists (the Jekyll home showed 5). */
export const LATEST_POSTS = 5;

/** The newest posts, already sorted newest first by the content loader. */
export function latestPosts<T>(posts: readonly T[], count = LATEST_POSTS) {
  return posts.slice(0, count);
}

/** Latest posts (#11): a `git log --oneline` of the newest posts. */
export function LatestPostsSection({
  posts,
}: {
  posts: readonly Pick<
    PostMeta,
    "slug" | "title" | "date" | "summary" | "permalink"
  >[];
}) {
  return (
    <section aria-labelledby="latest-posts">
      <SectionHead
        id="latest-posts"
        title="Latest posts"
        path="git log --oneline"
        link={{ href: BLOG_BASE, label: "all posts →", srLabel: "All posts" }}
      />
      {posts.length === 0 ? (
        <p className="mt-6">No posts yet.</p>
      ) : (
        <Stagger as="ul" className="mt-6 border-t border-dashed border-line">
          {posts.map((post) => (
            <StaggerItem
              as="li"
              key={post.slug}
              className="max-w-none border-b border-dashed border-line py-4"
            >
              <article className="grid gap-x-6 gap-y-1 sm:grid-cols-[11ch_minmax(0,1fr)]">
                <time
                  dateTime={post.date}
                  className="font-mono text-sm text-muted tabular-nums"
                >
                  {post.date}
                </time>
                <div>
                  <h3 className="m-0 font-mono text-lg">
                    <Link
                      href={post.permalink}
                      className={cn("inline-block min-h-6", focusRing)}
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-ink">{post.summary}</p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}
