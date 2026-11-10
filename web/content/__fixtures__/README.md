# Test fixtures

Post files used by the Vitest suite (`lib/content/*.test.ts`). The site only reads `content/posts/`, so nothing here is built or published.

- `posts/`: two published posts and one draft.
- `missing-field/`: a post without `summary`.
- `bad-date/`: a post dated 2026-02-30.
