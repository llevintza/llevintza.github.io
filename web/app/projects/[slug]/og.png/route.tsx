import { notFound } from "next/navigation";

import { pageCard, renderOgImage } from "@/lib/og";
import {
  getAllCaseStudies,
  getCaseStudyBySlug,
} from "@/lib/projects/case-studies";

// Static export: one PNG per case study, out/projects/<slug>/og.png.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getAllCaseStudies().map(({ slug }) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const study = getCaseStudyBySlug((await params).slug);
  if (!study) notFound();
  return renderOgImage(
    pageCard({
      title: study.title,
      subtitle: study.summary,
      path: study.permalink,
    }),
  );
}
