import { StackList } from "@/components/ui/tag";
import { getFeaturedProjects } from "@/lib/projects/featured";
import { buildMetadata } from "@/lib/site/metadata";

export const metadata = buildMetadata({
  title: "Projects",
  description: "Featured projects by Leo Levintza.",
  path: "/projects/",
});

export default function ProjectsPage() {
  const projects = getFeaturedProjects();

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

      {/* TODO(#22): "All public repos" section goes here, below Featured. */}
    </main>
  );
}
