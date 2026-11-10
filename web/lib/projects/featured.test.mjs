// Guards the public-content rule: private repos are listed by name only.
// Run with `pnpm test:featured` (Node 22 strips the types from the .ts import).
import assert from "node:assert/strict";
import { test } from "node:test";
import { featuredProjects } from "../../content/featured.ts";

test("no private featured project has a repoUrl", () => {
  const leaks = featuredProjects
    .filter((p) => p.access === "private" && p.repoUrl !== undefined)
    .map((p) => p.name);
  assert.deepEqual(leaks, []);
});

test("every public featured project links its GitHub repo", () => {
  for (const p of featuredProjects.filter((p) => p.access === "public")) {
    assert.match(
      p.repoUrl,
      /^https:\/\/github\.com\/llevintza\/[\w.-]+$/,
      p.name,
    );
  }
});
