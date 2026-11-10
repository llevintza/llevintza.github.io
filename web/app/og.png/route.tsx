import { pageCard, renderOgImage } from "@/lib/og";

// Static export: rendered once to out/og.png (the site-wide default) at build time.
export const dynamic = "force-static";

export function GET() {
  return renderOgImage(
    pageCard({
      title: "Leo Levintza",
      subtitle:
        "Principal Software Engineer: distributed systems, cloud-native backends, agentic AI tooling.",
      path: "/",
    }),
  );
}
