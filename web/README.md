# web/: Next.js rebuild

The Next.js version of https://llevintza.github.io/, built as a static export. It lives here until cutover; the Jekyll site at the repo root keeps serving until then.

Stack: Next.js (App Router), TypeScript (`strict`), ESLint (flat config: `next/core-web-vitals` + TypeScript) and Prettier, with pnpm. The visual design isn't chosen yet, so the pages are unstyled placeholders.

## Run it

Use Node 22 (`nvm use` reads `.nvmrc`) and pnpm through corepack (`package.json` pins the version):

```sh
corepack enable pnpm
pnpm install
pnpm dev          # http://localhost:3000
```

| Script                              | What it does                                                     |
| ----------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                          | Dev server with hot reload                                       |
| `pnpm build`                        | Static export to `out/` (`/blog/` becomes `out/blog/index.html`) |
| `pnpm start`                        | Serves `out/` as static files (run `pnpm build` first)           |
| `pnpm lint`                         | ESLint                                                           |
| `pnpm typecheck`                    | `tsc --noEmit`                                                   |
| `pnpm format` / `pnpm format:check` | Prettier write / check                                           |

`next.config.ts` sets `output: 'export'`, `trailingSlash: true` (URLs match the Jekyll site) and `images.unoptimized` (static export has no image optimizer).
