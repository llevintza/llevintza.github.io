/**
 * Featured projects for /projects/ (and later the home page).
 *
 * Text mirrors the `## Building` table in the public llevintza/llevintza
 * profile README; keep the two in sync. This file is the canonical list for
 * the Next.js site. It was ported from the Jekyll site's `_data/featured.yml`,
 * which is frozen until cutover (it still has the older 7-entry list), so edit
 * this file, not that one.
 *
 * Private repos are listed by name only: the type below makes a `repoUrl`
 * on a private entry a compile error, and the loader re-checks it at build.
 */

interface FeaturedBase {
  name: string;
  description: string;
  stack: readonly string[];
  /** A deployed demo. Only for sites that load (`pnpm check:live-sites`). */
  liveUrl?: string;
}

export interface PublicFeaturedProject extends FeaturedBase {
  access: "public";
  repoUrl: string;
}

export interface PrivateFeaturedProject extends FeaturedBase {
  access: "private";
  repoUrl?: never;
}

export type FeaturedProject = PublicFeaturedProject | PrivateFeaturedProject;

export const featuredProjects: readonly FeaturedProject[] = [
  {
    name: "instrument-price-dashboard",
    access: "private",
    liveUrl: "https://llevintza.github.io/instrument-price-dashboard/",
    description:
      "Dashboard over daily closing prices: a layered .NET 10 API serving price series with return, volatility and drawdown stats, and a React front end for search, charting and ticker comparison. Milestones M1-M3 shipped",
    stack: [
      ".NET 10",
      "React 19",
      "TanStack Query",
      "Recharts",
      "SignalR",
      "Playwright",
    ],
  },
  {
    name: "allocator-memo-builder",
    access: "private",
    description:
      "Fund-screening and memo-drafting tool: an LLM drafts the memo and a deterministic verifier traces every claim back to its source cell. Working MVP (v0.1.0)",
    stack: ["Python", "Streamlit", "pandas", "Pydantic", "Claude API"],
  },
  {
    name: "credit-desk-analytics",
    access: "public",
    repoUrl: "https://github.com/llevintza/credit-desk-analytics",
    liveUrl: "https://llevintza.github.io/credit-desk-analytics/",
    description:
      "Front-office analytics for a structured-credit desk: very large position grids, fund performance and deal exploration. Built spec-first and tuned for load and render speed. Phases 0-6 shipped",
    stack: [
      ".NET 10",
      "Angular",
      "Postgres",
      "AG Grid",
      "Dapper/EF Core",
      "Playwright",
    ],
  },
  {
    name: "energlens",
    access: "public",
    repoUrl: "https://github.com/llevintza/energlens",
    liveUrl: "https://llevintza.github.io/energlens/",
    description:
      "Utility-bill analytics across properties, with a Claude-powered PDF extraction CLI. Zero-cost demo deployment",
    stack: ["Python/FastAPI", "SQLAlchemy 2.0", "React 19", "Claude API"],
  },
  {
    name: "hedge-fund-market-data",
    access: "private",
    description:
      "Market-data platform: Python ingestion onto a canonical instrument model, a dbt medallion warehouse (DuckDB, Snowflake-ready) and Airflow batch orchestration. Phase 2",
    stack: ["Python", "dbt", "Airflow", "DuckDB", "Snowflake", ".NET"],
  },
  {
    name: "unlistd",
    access: "public",
    repoUrl: "https://github.com/llevintza/unlistd",
    description:
      "Self-hosted data-broker PII removal pipeline that keeps profiles, keys and audit trails in your own AWS account. Early MVP",
    stack: [
      "TypeScript",
      "Next.js",
      "Prisma",
      "AWS CDK",
      "SQS/Lambda/Fargate",
      "Playwright",
    ],
  },
  {
    name: "openswim",
    access: "public",
    repoUrl: "https://github.com/llevintza/openswim",
    description:
      "Free, ad-free operations platform for small-town swim teams. Phase 0: Go/Postgres API foundations, domain model and observability contract fixed by ADR",
    stack: ["Go", "PostgreSQL", "Next.js", "OpenAPI"],
  },
  {
    name: "aws-fastify-prometheus",
    access: "public",
    repoUrl: "https://github.com/llevintza/aws-fastify-prometheus",
    description:
      "@llevintza/fastify-prometheus-metrics: automatic Prometheus HTTP metrics with an optional CloudWatch bridge. v1.0.2, MIT",
    stack: ["TypeScript", "Fastify", "Prometheus", "CloudWatch"],
  },
  {
    name: "claude-codebase-agent",
    access: "public",
    repoUrl: "https://github.com/llevintza/claude-codebase-agent",
    description:
      "Claude Agent SDK CLI that explores unfamiliar codebases and implements features behind a human approval gate",
    stack: ["Python", "Claude Agent SDK", "MCP"],
  },
  {
    name: "aws-config-service",
    access: "public",
    repoUrl: "https://github.com/llevintza/aws-config-service",
    description:
      "Multi-tenant configuration REST API with a Fastify / DynamoDB / filesystem layered design. v1.0.3",
    stack: ["TypeScript", "Fastify", "DynamoDB", "OpenAPI"],
  },
];
