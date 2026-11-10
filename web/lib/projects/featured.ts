import { featuredProjects, type FeaturedProject } from "@/content/featured";

/**
 * Throws if any private project carries a repo URL. The type in
 * `content/featured.ts` already forbids it; this catches casts, `any`, or
 * data that bypasses the type, and fails the build with a clear message.
 */
export function assertNoPrivateRepoLinks(
  projects: readonly FeaturedProject[],
): void {
  // Widen the type: at the type level a private repoUrl is impossible, so a
  // narrowed check would collapse to `never`. Check the runtime shape instead.
  const entries: readonly {
    name: string;
    access: string;
    repoUrl?: unknown;
  }[] = projects;
  const leaks = entries.filter(
    (p) => p.access === "private" && p.repoUrl !== undefined,
  );
  if (leaks.length > 0) {
    const names = leaks.map((p) => p.name).join(", ");
    throw new Error(
      `Featured projects: private repos must not have a repoUrl (${names}). ` +
        "Private repos are listed by name only; remove repoUrl from content/featured.ts.",
    );
  }
}

/** The featured projects, validated. Runs at build time (static export). */
export function getFeaturedProjects(): readonly FeaturedProject[] {
  assertNoPrivateRepoLinks(featuredProjects);
  return featuredProjects;
}
