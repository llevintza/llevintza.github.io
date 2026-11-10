import Link from "next/link";

import { AllRepos } from "@/components/projects/all-repos";
import { StackList } from "@/components/ui/tag";
import { getAllCaseStudies } from "@/lib/projects/case-studies";
import { getFeaturedProjects } from "@/lib/projects/featured";
import { getPublicReposCached } from "@/lib/projects/repos";
import { buildMetadata } from "@/lib/site/metadata";

export const metadata = buildMetadata({
  title: "Projects",
  description: "Featured projects and all public repos by Leo Levintza.",
  path: "/projects/",
  image: "page",
});

export default async function ProjectsPage() {
  const projects = getFeaturedProjects();
  const repos = await getPublicReposCached();
  const caseStudies = new Map(
    getAllCaseStudies().map((study) => [study.slug, study.permalink]),
  );

  return (
    <main>
      <section aria-labelledby="featured-heading">
        <h1 id="featured-heading">Projects</h1>
        {/* Minimal markup on purpose: #8 builds the real project card. */}
        {projects.map((project) => (
          <article
            key={project.name}
            aria-labelledby={`project-${project.name}`}
          >
            <h2 id={`project-${project.name}`}>
              {caseStudies.has(project.name) ? (
                <Link href={caseStudies.get(project.name)!}>
                  {project.name}
                </Link>
              ) : (
                project.name
              )}
            </h2>
            <p>{project.description}</p>
            <StackList items={project.stack} />
            <p>
              {project.liveUrl ? (
                <>
                  <a href={project.liveUrl}>Live site</a>
                  {" · "}
                </>
              ) : null}
              {project.access === "public" ? (
                <a href={project.repoUrl}>Source</a>
              ) : (
                <span>Source on request</span>
              )}
            </p>
          </article>
        ))}
        <p>
          Private repos: email me your GitHub username for read-only access.
        </p>
      </section>

      <AllRepos repos={repos} />
    </main>
  );
}
