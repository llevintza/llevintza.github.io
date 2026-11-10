// About-page content, mirrored from the public profile README
// (github.com/llevintza/llevintza) and the Jekyll `about.md`.
// Public sources only. `now` and `selectedWork` are also meant for the
// home-page highlights (#13), so keep them free of page-specific markup.

/** A line of text with an optional inline internal link. */
export type RichLine = {
  text: string;
  /** Internal links only; external URLs need rel/target handling. The type
   * cannot reject protocol-relative `//host` values, so never author one. */
  link?: { label: string; href: `/${string}` };
  /** Text after the link, e.g. a closing parenthesis. */
  after?: string;
};

export type Certification = {
  issuer: string;
  courses: readonly string[];
  year: number;
};

export type Education = {
  degree: string;
  institution: string;
  startYear: number;
  endYear: number;
};

export type Languages = {
  fluent: readonly string[];
  basic: readonly string[];
};

export type About = {
  name: string;
  headline: string;
  bio: string;
  now: readonly RichLine[];
  selectedWork: readonly string[];
  certifications: readonly Certification[];
  education: readonly Education[];
  languages: Languages;
  /** One-line analytics note (ADR 0002, #58). */
  privacyNote: string;
};

export const now: readonly RichLine[] = [
  {
    text: "Embedding agentic AI into the SDLC: code-review agents, agent evaluation frameworks, MCP servers and Claude Agent SDK pipelines",
  },
  {
    text: "Founding and architecting open-source platforms in Go, TypeScript and Python (see ",
    link: { label: "Projects", href: "/projects/" },
    after: ")",
  },
];

export const selectedWork: readonly string[] = [
  "Cut legacy-system discovery on an undocumented investment-operations platform from 3-6 months to 6 weeks by embedding agentic AI tooling into the SDLC",
  "Decomposed a monolithic data-graph service on a major US retailer's e-commerce platform: 40% faster responses, 90% less CPU/memory, 50% lower operational cost",
  "Led an Apollo Federation GraphQL orchestration layer at Black Friday scale, working directly with Apollo's engineering team on scaling limits",
  "Built an F# Kafka-to-EventStore replication service sustaining 5,000 events/sec per instance on Docker and Nomad",
  "Built the observability and alerting stack (Splunk, Prometheus, Grafana, xMatters/PagerDuty) that cut SLA response from 30-45 to 10-15 minutes; retrofitted Datadog across a 100+ project .NET estate with zero code changes",
  "Built an OOXML reporting framework for a quantitative hedge fund that cut slide preparation time 100x",
];

export const about: About = {
  name: "Leo Levintza",
  headline:
    "Principal Software Engineer · Distributed Systems · Cloud-Native Backends · Agentic AI Tooling & AI-Augmented SDLC · New York Metro Area",
  bio: "I design and build distributed, cloud-native backend systems, most recently for buy-side firms: a quantitative hedge fund, a global alternative asset manager, and a large US asset manager. Lately I embed agentic AI tooling (Claude Code, GitHub Copilot CLI, Sourcegraph Cody) into the SDLC: legacy discovery, documentation, code-review agents, and evaluation frameworks for AI-assisted delivery.",
  now,
  selectedWork,
  certifications: [
    {
      issuer: "Anthropic Education",
      courses: [
        "Building with the Claude API",
        "Claude Code in Action",
        "Introduction to Agent Skills",
        "Introduction to Model Context Protocol",
        "AI Fluency: Framework & Foundations",
      ],
      year: 2026,
    },
    {
      issuer: "LangChain Academy",
      courses: ["Introduction to LangGraph"],
      year: 2024,
    },
  ],
  education: [
    {
      degree: "BA, Computer Science",
      institution: "Stefan cel Mare University of Suceava",
      startYear: 2008,
      endYear: 2012,
    },
  ],
  languages: {
    fluent: ["English", "Romanian", "Russian"],
    basic: ["Italian", "German"],
  },
  privacyNote:
    "This site uses Umami, a cookie-free analytics service that stores no personal data. Aggregate stats are kept in the EU.",
};

/** "A", "A and B", "A, B, and C" (serial comma, as in the README). */
export function formatList(items: readonly string[]): string {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** "Fluent in English, Romanian, and Russian; basic Italian and German." */
export function formatLanguages({ fluent, basic }: Languages): string {
  const parts: string[] = [];
  if (fluent.length > 0) parts.push(`Fluent in ${formatList(fluent)}`);
  if (basic.length > 0) parts.push(`basic ${formatList(basic)}`);
  return parts.length > 0 ? `${parts.join("; ")}.` : "";
}
