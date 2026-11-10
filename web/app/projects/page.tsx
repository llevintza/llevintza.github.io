import type { Metadata } from "next";
import { AllRepos } from "@/components/projects/all-repos";
import { getFeaturedProjects } from "@/lib/projects/featured";
import { getPublicReposCached } from "@/lib/projects/repos";

export const metadata: Metadata = {
  title: "Projects",
  description: "Featured projects and all public repos by Leo Levintza.",
};

export default async function ProjectsPage() {
  const projects = getFeaturedProjects();
  const repos = await getPublicReposCached();

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
            <h2 id={`project-${project.name}`}>{project.name}</h2>
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

      <AllRepos repos={repos} />
    </main>
  );
}
