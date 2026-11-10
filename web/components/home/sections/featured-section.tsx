import { Stagger, StaggerItem } from "@/components/motion";
import {
  Card,
  CardBar,
  CardBody,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { focusRing } from "@/components/ui/focus";
import { StackList } from "@/components/ui/tag";
import type { FeaturedProject } from "@/content/featured";

import { SectionHead } from "./section-head";

const footerLink = cn(
  "inline-flex min-h-6 items-center gap-1 font-mono text-sm",
  focusRing,
);

function ProjectCard({ project }: { project: FeaturedProject }) {
  return (
    <Card className="h-full">
      <CardBar aside={project.access}>~/building/{project.name}</CardBar>
      <CardBody>
        <CardTitle>
          {project.name}
          {project.access === "private" ? (
            <span className="sr-only"> (private)</span>
          ) : null}
        </CardTitle>
        <p>{project.description}</p>
        <StackList items={project.stack} className="mt-auto" />
      </CardBody>
      <CardFooter>
        {project.liveUrl ? (
          <a href={project.liveUrl} className={footerLink}>
            Live site
            <span className="sr-only">: {project.name}</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        {/* Private repos are named only: the type forbids a repoUrl. */}
        {project.access === "public" ? (
          <a href={project.repoUrl} className={footerLink}>
            Source
            <span className="sr-only">: {project.name} on GitHub</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="font-mono text-sm text-muted">
            Source on request
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

/** Featured projects (#11): the `## Building` table as console windows. */
export function FeaturedSection({
  projects,
}: {
  projects: readonly FeaturedProject[];
}) {
  return (
    <section aria-labelledby="featured-projects">
      <SectionHead
        id="featured-projects"
        title="Featured projects"
        path="~/building"
        link={{
          href: "/projects/",
          label: "ls -a →",
          srLabel: "All projects and public repos",
        }}
      />
      <Stagger
        as="ul"
        className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        {projects.map((project) => (
          <StaggerItem as="li" key={project.name}>
            <ProjectCard project={project} />
          </StaggerItem>
        ))}
      </Stagger>
      <p className="mt-6 font-mono text-sm text-muted">
        Private repos: email me your GitHub username for read-only access.
      </p>
    </section>
  );
}
