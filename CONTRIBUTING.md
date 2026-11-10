# Contributing

Every change reaches `main` through a feature branch and a pull request. Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/), and both are checked locally and in CI.

## Setup

The root `package.json` holds repo tooling only (husky and commitlint). It is not the Jekyll site, and any app added later keeps its own separate package.

```sh
corepack enable        # or install the pnpm version pinned in package.json's "packageManager"
pnpm install           # installs the tooling and, via "prepare", the commit-msg hook
```

On Node 25 or later corepack no longer ships with Node: run `npm install -g corepack` first.

## Branches

Name branches `<type>/<issue>-<slug>`, where `<type>` is one of the commit types below and `<issue>` is the GitHub issue number:

```text
feat/3-scaffold-nextjs
ci/40-conventional-commits
fix/57-broken-feed-link
```

Never push to `main` directly.

## Commit messages

```text
type(scope): subject

optional body explaining what and why

optional trailers
```

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` (and `revert`).
- **scope** is optional: the area touched, such as `web`, `blog`, `ci`, `deps`.
- **subject**: imperative mood, lower case, no trailing full stop.
- Mark a breaking change with `!` after the type or scope, or a `BREAKING CHANGE:` footer.
- Trailers such as `Co-Authored-By:` go after a blank line at the end.

Good:

```text
feat(web): add MDX blog post layout
fix(blog): correct RSS feed link on the home page
docs: describe the PR flow in CONTRIBUTING
ci: pin workflow actions to commit SHAs
```

Rejected by the hook and by CI:

```text
Updated some stuff.          (no type, ends with a full stop)
feat: Add New Layout         (subject must not be sentence/title case)
feature(web): add layout     (unknown type)
```

The `commit-msg` hook runs `commitlint` on every commit. CI runs the same check on every commit in a PR.

## Pull requests

- Open PRs against `main` only.
- The PR title follows the same format as a commit message (`type(scope): subject`), since it can become the squash commit message.
- The PR body has a summary, `Closes #<issue>`, how the change was verified (commands and results) and screenshots for visible changes.

### What `main` requires

The ruleset on `main` requires:

- a pull request (no direct pushes),
- these required checks passing,
- every review conversation resolved.

This is the single source for the required-checks list; update it here when branch protection changes.

| Check | Workflow | What it checks |
|---|---|---|
| **Commit messages** | `conventional-commits.yml` | Every commit in the PR follows Conventional Commits |
| **PR title** | `conventional-commits.yml` | The PR title follows Conventional Commits |
| **Web: lint, typecheck, build** | `ci.yml` | In `web/`: Prettier, ESLint, `tsc` and the static export build. It reports on every PR, and skips the heavy steps when `web/` is unchanged |
| **Lighthouse budgets** | `lighthouse.yml` | Lighthouse scores for `/`, `/projects/` and the newest post meet the budgets in [`web/README.md`](web/README.md) |
| **Playwright** | `e2e.yml` | In `web/`: Playwright smoke tests against the static export, plus UX screenshots. It reports on every PR, and skips the heavy steps when `web/` is unchanged |
| **Public content guardrail** | `public-content.yml` | Scans the `web/` static export for phone numbers, personal email addresses and links to private repos (see [README](README.md#public-content-rules)) |

It requires no approvals, because all agents post on GitHub under the owner's account and GitHub does not let an author approve their own PR.

### Reviews and merging

- Because every agent posts as the owner, each PR comment and thread reply written by an agent starts with a role tag such as `[PR Author]` or `[Max]`, so readers can tell who is speaking.
- The PR author fixes or answers each review thread, replies with the tag, and resolves it.
- Rex, Helms and Arch review (content-only PRs need only Rex); Max merges once the gate is clear. Authors don't merge their own PRs.
