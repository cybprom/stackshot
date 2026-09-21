import type { StackDoc } from "@/lib/stack-map/types";

// Milestone 0 only — deleted at teardown. Rendered to disk, never deployed.
//
// The densest card the layout must hold: four layers, six items each, names long
// enough to wrap every band to two lines. That is the condition minHeight 120 was
// derived from and therefore the condition the 800 canvas was derived from, and
// SPIKE_DOC never reaches it. The repo name is 32 characters, so it also exercises
// card/display stepping down to 40.
export const WORST_CASE_DOC: StackDoc = {
  owner: "open-telemetry",
  repo: "opentelemetry-javascript-contrib",
  language: "TypeScript",
  stars: 284000,
  asOf: "2026-03-14",
  layers: [
    {
      category: "frontend",
      overflow: 12,
      items: [
        {
          id: "react-hook-form",
          display: "React Hook Form",
          version: "7",
          description: "Uncontrolled form state and validation.",
        },
        {
          id: "tanstack-router",
          display: "TanStack Router",
          version: "1",
          description: "Type-safe client routing.",
        },
        {
          id: "styled-components",
          display: "Styled Components",
          version: "6",
          description: "CSS-in-JS styling.",
        },
        {
          id: "framer-motion",
          display: "Framer Motion",
          version: "11",
          description: "Declarative animation.",
        },
        {
          id: "testing-library",
          display: "Testing Library",
          version: "16",
          description: "DOM-centric component testing.",
        },
        {
          id: "storybook",
          display: "Storybook",
          version: "8",
          description: "Component workshop and visual review.",
        },
      ],
    },
    {
      category: "backend",
      overflow: 9,
      items: [
        {
          id: "postgres",
          display: "PostgreSQL",
          version: "16",
          description: "Relational database.",
        },
        {
          id: "elasticsearch",
          display: "Elasticsearch",
          version: "8",
          description: "Search and analytics engine.",
        },
        {
          id: "rabbitmq",
          display: "RabbitMQ",
          version: "3",
          description: "Message broker.",
        },
        {
          id: "apollo-server",
          display: "Apollo Server",
          version: "4",
          description: "GraphQL server.",
        },
        {
          id: "prisma",
          display: "Prisma",
          version: "6",
          description: "Typed ORM and migration tool.",
        },
        {
          id: "nestjs",
          display: "NestJS",
          version: "10",
          description: "Opinionated server framework.",
        },
      ],
    },
    {
      category: "infra",
      overflow: 7,
      items: [
        {
          id: "github-actions",
          display: "GitHub Actions",
          description: "CI hosted alongside the repo.",
        },
        {
          id: "docker-compose",
          display: "Docker Compose",
          description: "Multi-container local environments.",
        },
        {
          id: "cloudformation",
          display: "CloudFormation",
          description: "Declarative AWS provisioning.",
        },
        {
          id: "kubernetes",
          display: "Kubernetes",
          description: "Container orchestration.",
        },
        {
          id: "terraform",
          display: "Terraform",
          version: "1",
          description: "Infrastructure as code.",
        },
        {
          id: "opentelemetry",
          display: "OpenTelemetry",
          version: "1",
          description: "Traces, metrics and logs.",
        },
      ],
    },
    {
      category: "tooling",
      overflow: 15,
      items: [
        {
          id: "semantic-release",
          display: "Semantic Release",
          version: "24",
          description: "Automated versioning from commit messages.",
        },
        {
          id: "commitlint",
          display: "Commitlint",
          version: "19",
          description: "Commit message linting.",
        },
        {
          id: "changesets",
          display: "Changesets",
          version: "2",
          description: "Multi-package version and changelog management.",
        },
        {
          id: "playwright",
          display: "Playwright",
          version: "1",
          description: "Browser automation and end-to-end tests.",
        },
        {
          id: "turborepo",
          display: "Turborepo",
          version: "2",
          description: "Monorepo task runner with caching.",
        },
        {
          id: "renovate",
          display: "Renovate",
          description: "Automated dependency updates.",
        },
      ],
    },
  ],
  unmapped: ["lodash.merge", "readable-stream", "safe-buffer"],
};
