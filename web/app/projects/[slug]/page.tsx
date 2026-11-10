import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { outboundProjectEvent } from "@/components/analytics/events";
import { StackList } from "@/components/ui/tag";
import { renderMdx } from "@/lib/content/mdx";
import {
  getAllCaseStudies,
  getCaseStudyBySlug,
  type CaseStudy,
  type Screenshot,
} from "@/lib/projects/case-studies";
import { buildMetadata } from "@/lib/site/metadata";

/** The `<img>` style caps the screenshot at 48rem, so it never renders wider. */
const SCREENSHOT_SIZES = "(min-width: 48rem) 48rem, 100vw";

type Props = PageProps<"/projects/[slug]">;

// Static export: only the case studies listed below exist.
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getAllCaseStudies().map(({ slug }) => ({ slug }));
}

async function findCaseStudy(params: Props["params"]): Promise<CaseStudy> {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) notFound();
  return study;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const study = await findCaseStudy(params);
  // The root layout's title template appends the site name.
  return buildMetadata({
    title: `${study.title}: case study`,
    description: study.summary,
    path: study.permalink,
    image: "page",
  });
}

export default async function CaseStudyPage({ params }: Props) {
  const study = await findCaseStudy(params);
  const content = await renderMdx(study.body);

  return (
    <main>
      <article>
        <header>
          <p>
            <Link href="/projects/">Projects</Link>
          </p>
          <h1>{study.title}</h1>
          <p>{study.summary}</p>
          <p>
            {study.access === "public" && study.repo ? (
              <a
                href={study.repo}
                {...outboundProjectEvent(study.slug, "repo")}
              >
                Source on GitHub
              </a>
            ) : (
              <span>Source on request</span>
            )}
          </p>
        </header>

        {/* MDX body: ## Problem, then ## Approach (checked at build). */}
        {content}

        <section aria-labelledby="stack-heading">
          <h2 id="stack-heading">Stack</h2>
          <StackList items={study.stack} />
        </section>

        {study.screenshots.length > 0 ? (
          <section aria-labelledby="screenshots-heading">
            <h2 id="screenshots-heading">Screenshots</h2>
            {study.screenshots.map((shot) => (
              <ScreenshotFigure key={shot.src} shot={shot} />
            ))}
          </section>
        ) : null}

        <section aria-labelledby="live-heading">
          <h2 id="live-heading">Live site</h2>
          {study.liveUrl ? (
            <p>
              <a
                href={study.liveUrl}
                {...outboundProjectEvent(study.slug, "live")}
              >
                {study.liveUrl}
              </a>
            </p>
          ) : (
            <p>No public demo yet.</p>
          )}
        </section>

        {study.access === "private" ? (
          <p>
            The source is private. Read-only access is available on request.
          </p>
        ) : null}
      </article>
    </main>
  );
}

/**
 * AVIF, then WebP, then a palette PNG. Screenshots sit below the fold, so
 * they load lazily; width and height reserve the space (no layout shift).
 */
function ScreenshotFigure({ shot }: { shot: Screenshot }) {
  return (
    <figure>
      <picture>
        <source
          type="image/avif"
          srcSet={shot.srcSet.avif}
          sizes={SCREENSHOT_SIZES}
        />
        <source
          type="image/webp"
          srcSet={shot.srcSet.webp}
          sizes={SCREENSHOT_SIZES}
        />
        <img
          src={shot.src}
          srcSet={shot.srcSet.png}
          sizes={SCREENSHOT_SIZES}
          width={shot.width}
          height={shot.height}
          alt={shot.alt}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", maxWidth: "48rem", height: "auto" }}
        />
      </picture>
    </figure>
  );
}
