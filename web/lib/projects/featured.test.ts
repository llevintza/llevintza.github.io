// Guards the public-content rule: private repos are listed by name only.
import { describe, expect, it } from "vitest";
import { featuredProjects, type FeaturedProject } from "@/content/featured";
import { assertNoPrivateRepoLinks, getFeaturedProjects } from "./featured";

describe("featured projects data", () => {
  it("has no private project with a repoUrl", () => {
    // Check the runtime shape: at the type level a private repoUrl is
    // impossible, so a narrowed filter would collapse to `never`.
    const entries: readonly {
      name: string;
      access: string;
      repoUrl?: unknown;
    }[] = featuredProjects;
    const leaks = entries
      .filter((p) => p.access === "private" && p.repoUrl !== undefined)
      .map((p) => p.name);
    expect(leaks).toEqual([]);
  });

  it("links every public project to its GitHub repo", () => {
    for (const p of featuredProjects) {
      if (p.access === "public") {
        expect(p.repoUrl, p.name).toMatch(
          /^https:\/\/github\.com\/llevintza\/[\w.-]+$/,
        );
      }
    }
  });
});

describe("assertNoPrivateRepoLinks", () => {
  it("accepts the real data", () => {
    expect(getFeaturedProjects()).toBe(featuredProjects);
  });

  it("throws, naming the project, when a private entry has a repoUrl", () => {
    const leaky = {
      name: "secret-repo",
      description: "",
      stack: [],
      access: "private",
      repoUrl: "https://github.com/llevintza/secret-repo",
    } as unknown as FeaturedProject;
    expect(() => assertNoPrivateRepoLinks([leaky])).toThrow(
      /private repos must not have a repoUrl \(secret-repo\)/,
    );
  });
});
