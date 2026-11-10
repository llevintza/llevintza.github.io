import { describe, expect, it } from "vitest";

import { about } from "@/content/about";
import { featuredProjects } from "@/content/featured";

import {
  building,
  headline,
  intro,
  name,
  panelStages,
  tagline,
} from "./content";

const kebab = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

describe("hero content", () => {
  it("takes name, headline and intro from the README mirror", () => {
    expect(name).toBe(about.name);
    expect(headline).toBe(about.headline);
    expect(intro).toBe(about.bio);
  });

  it("tagline flags spell out the README headline", () => {
    const parts = headline.split(" · ");
    const location = parts.pop()!;
    const flags = tagline
      .slice(0, -1)
      .flatMap((line) => line.split(" --"))
      .map((flag) => flag.trim());
    // "A & B" in the headline becomes two flags.
    expect(flags).toEqual(
      parts.flatMap((part) => part.split(" & ")).map(kebab),
    );
    expect(tagline.at(-1)).toBe(`location="${location}"`);
  });

  it("every panel stage names a featured project", () => {
    const names = featuredProjects.map((p) => p.name);
    for (const key of Object.keys(panelStages)) expect(names).toContain(key);
  });

  it("panel rows follow featured.ts order and privacy", () => {
    const expected = featuredProjects
      .filter((p) => p.name in panelStages)
      .map((p) => ({ repo: p.name, private: p.access === "private" }));
    expect(
      building.map(({ repo, private: p }) => ({ repo, private: p })),
    ).toEqual(expected);
  });
});
