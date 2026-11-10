import { ContactSection } from "@/components/contact/contact-section";
import { Hero } from "@/components/home/hero";
import { FeaturedSection } from "@/components/home/sections/featured-section";
import {
  LatestPostsSection,
  latestPosts,
} from "@/components/home/sections/latest-posts-section";
import { NowSection } from "@/components/home/sections/now-section";
import { SelectedWorkSection } from "@/components/home/sections/selected-work-section";
import { Reveal } from "@/components/motion";
import { highlights } from "@/content/highlights";
import { getAllPosts } from "@/lib/content/posts";
import { getFeaturedProjects } from "@/lib/projects/featured";
import { buildMetadata } from "@/lib/site/metadata";

export const metadata = buildMetadata({ path: "/", image: "page" });

/**
 * Home (#11, #13): the hero (headline and intro from the profile README),
 * then Now, Selected work, featured projects, the latest posts and contact.
 */
export default function HomePage() {
  const posts = latestPosts(getAllPosts());

  return (
    // The hero runs full-bleed, so it opts out of the default <main> frame;
    // the sections below share the site's content width.
    <main id="main" className="max-w-none p-0 sm:p-0">
      <Hero />
      <div className="mx-auto grid max-w-wrap gap-section px-4 py-16 sm:px-gutter sm:py-20 [&>*]:mt-0">
        <NowSection lines={highlights.now} />
        <SelectedWorkSection
          items={highlights.selectedWork}
          metrics={highlights.metrics}
        />
        <FeaturedSection projects={getFeaturedProjects()} />
        <LatestPostsSection posts={posts} />
        <Reveal>
          <ContactSection />
        </Reveal>
      </div>
    </main>
  );
}
