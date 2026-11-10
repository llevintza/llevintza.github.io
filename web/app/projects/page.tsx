import type { Metadata } from "next";
import Link from "next/link";

import { getAllCaseStudies } from "@/lib/projects/case-studies";
import { getFeaturedProjects } from "@/lib/projects/featured";

export const metadata: Metadata = {
  title: "Projects",
  description: "Featured projects by Leo Levintza.",
};

export default function ProjectsPage() {
  const projects = getFeaturedProjects();
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
            <ul aria-label="Stack">
              {project.stack.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
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

      {/* TODO(#22): "All public repos" section goes here, below Featured. */}
    </main>
  );
}
