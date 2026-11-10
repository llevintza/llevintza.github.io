import { getAllPosts } from "@/lib/content/posts";
import { buildAtomFeed } from "@/lib/feed/atom";

// Static export: `next build` writes the response to `out/feed.xml`.
export const dynamic = "force-static";

/** Atom feed at the URL jekyll-feed used, so subscribers keep working. */
export function GET(): Response {
  return new Response(buildAtomFeed(getAllPosts()), {
    // Only applies in `next dev`/`next start`: the static export writes the body
    // to out/feed.xml, and GitHub Pages picks the MIME type from the extension.
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
