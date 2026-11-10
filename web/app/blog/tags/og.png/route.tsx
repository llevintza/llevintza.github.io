import { BLOG_BASE } from "@/lib/content/tags";
import { pageCard, renderOgImage } from "@/lib/og";

// Static export: rendered once to out/blog/tags/og.png at build time.
export const dynamic = "force-static";

export function GET() {
  return renderOgImage(
    pageCard({
      title: "Tags",
      subtitle: "Every tag used on Leo Levintza's blog.",
      path: `${BLOG_BASE}tags/`,
    }),
  );
}
