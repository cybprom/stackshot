import type { StackDoc } from "@/lib/stack-map/types";

// Milestone 0 only — deleted at teardown with the crude renderer.
// Contents are DESIGN.md's CARD ANATOMY example verbatim, not detection output,
// so a render can be held against the drawing. They are not claims about the repo.
export const SPIKE_DOC: StackDoc = {
  owner: "vercel",
  repo: "next.js",
  language: "TypeScript",
  stars: 128000,
  asOf: "2026-03-14",
  layers: [
    {
      category: "frontend",
      overflow: 0,
      items: [
        {
          id: "next",
          display: "Next.js",
          version: "15",
          description: "React framework with file-based routing and server rendering.",
        },
        { id: "react", display: "React", version: "19", description: "UI library." },
        {
          id: "tailwindcss",
          display: "Tailwind",
          version: "4",
          description: "Utility-first CSS framework.",
        },
        {
          id: "tanstack-query",
          display: "TanStack Query",
          version: "5",
          description: "Server-state cache for async data.",
        },
        {
          id: "zod",
          display: "Zod",
          version: "3",
          description: "Schema validation with inferred types.",
        },
      ],
    },
    {
      category: "backend",
      overflow: 0,
      items: [
        {
          id: "node",
          display: "Node",
          version: "22",
          description: "JavaScript runtime.",
        },
        {
          id: "postgres",
          display: "PostgreSQL",
          version: "16",
          description: "Relational database.",
        },
        {
          id: "prisma",
          display: "Prisma",
          version: "6",
          description: "Typed ORM and migration tool.",
        },
      ],
    },
    {
      category: "infra",
      overflow: 0,
      items: [
        { id: "docker", display: "Docker", description: "Container runtime." },
        {
          id: "github-actions",
          display: "GitHub Actions",
          description: "CI hosted alongside the repo.",
        },
        { id: "vercel", display: "Vercel", description: "Deployment platform." },
      ],
    },
    {
      category: "tooling",
      overflow: 4,
      items: [
        {
          id: "pnpm",
          display: "pnpm",
          description: "Package manager with a content-addressed store.",
        },
        { id: "vitest", display: "Vitest", description: "Test runner." },
        { id: "eslint", display: "ESLint", description: "Linter." },
      ],
    },
  ],
  unmapped: ["nanoid", "ms"],
};
