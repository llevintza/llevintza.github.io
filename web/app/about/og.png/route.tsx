import { pageCard, renderOgImage } from "@/lib/og";

// Static export: rendered once to out/about/og.png at build time.
export const dynamic = "force-static";

export function GET() {
  return renderOgImage(
    pageCard({
      title: "About",
      subtitle:
        "Principal Software Engineer: distributed systems, cloud-native backends, and agentic AI tooling for the SDLC.",
      path: "/about/",
    }),
  );
}
