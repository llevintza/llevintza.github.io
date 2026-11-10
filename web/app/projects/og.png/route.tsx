import { pageCard, renderOgImage } from "@/lib/og";

// Static export: rendered once to out/projects/og.png at build time.
export const dynamic = "force-static";

export function GET() {
  return renderOgImage(
    pageCard({
      title: "Projects",
      subtitle: "Featured projects by Leo Levintza.",
      path: "/projects/",
    }),
  );
}
