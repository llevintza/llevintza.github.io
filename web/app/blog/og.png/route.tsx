import { pageCard, renderOgImage } from "@/lib/og";

// Static export: rendered once to out/blog/og.png at build time.
export const dynamic = "force-static";

export function GET() {
  return renderOgImage(
    pageCard({
      title: "Blog",
      subtitle: "Posts by Leo Levintza, newest first.",
      path: "/blog/",
    }),
  );
}
