import { describe, expect, it } from "vitest";
import { DENY, STACK_MAP, entryById, isDenied, lookup } from "@/lib/stack-map";
import { ECOSYSTEMS } from "@/lib/stack-map/types";
import { detect } from "@/lib/detect";
import { recordedManifests, recordedRootPaths } from "@/tests/helpers/manifests";

const CATEGORIES = ["frontend", "backend", "infra", "tooling"];
const NAMESPACED = new RegExp(`^(${ECOSYSTEMS.join("|")}):.+`);
// A stand-in suffix for testing what a glob alias would match.
const probe = (alias: string) => alias.replace(/\*$/, "probe");

describe("map integrity", () => {
  it("has at least ~120 entries", () => {
    expect(STACK_MAP.length).toBeGreaterThanOrEqual(120);
  });

  it.each(STACK_MAP.map((e) => [e.id, e] as const))("%s is well-formed", (_id, entry) => {
    expect(entry.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(entry.display.trim()).not.toBe("");
    // Wider than this and a card row can't hold two items.
    expect(entry.display.length).toBeLessThanOrEqual(20);
    expect(CATEGORIES).toContain(entry.category);
    expect(entry.description.trim()).not.toBe("");
    expect(entry.description).not.toMatch(/\n/);
    expect(entry.description.length).toBeLessThanOrEqual(80);
    expect(Number.isInteger(entry.weight) && entry.weight >= 1 && entry.weight <= 100).toBe(true);
    expect(entry.aliases.length).toBeGreaterThan(0);
  });

  it("has no duplicate ids", () => {
    const ids = STACK_MAP.map((e) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("namespaces every alias with a known ecosystem, and globs only as a trailing *", () => {
    for (const entry of STACK_MAP) {
      for (const alias of entry.aliases) {
        expect(alias, `${entry.id}: ${alias}`).toMatch(NAMESPACED);
        expect(alias.slice(0, -1), `${entry.id}: ${alias}`).not.toContain("*");
      }
    }
  });

  it("claims each alias for exactly one entry", () => {
    const owners = new Map<string, string>();
    for (const entry of STACK_MAP) {
      for (const alias of entry.aliases) {
        expect(owners.get(alias), `${alias} is in ${owners.get(alias)} and ${entry.id}`).toBeUndefined();
        owners.set(alias, entry.id);
      }
    }
  });

  it("resolves every alias back to its own entry", () => {
    for (const entry of STACK_MAP) {
      for (const alias of entry.aliases) expect(lookup(probe(alias))?.id, alias).toBe(entry.id);
    }
  });

  it("resolves every suppresses id to an existing entry, never itself", () => {
    for (const entry of STACK_MAP) {
      for (const id of entry.suppresses ?? []) {
        expect(entryById(id), `${entry.id} suppresses unknown ${id}`).toBeDefined();
        expect(id).not.toBe(entry.id);
      }
    }
  });

  it("never denies something the map claims", () => {
    for (const entry of STACK_MAP) {
      for (const alias of entry.aliases) expect(isDenied(probe(alias)), `${entry.id}: ${alias}`).toBe(false);
    }
  });

  it("namespaces every deny pattern with a known ecosystem", () => {
    for (const pattern of DENY) expect(pattern).toMatch(NAMESPACED);
  });

  it("covers every ecosystem, not only the ones in the fixtures", () => {
    for (const ecosystem of ECOSYSTEMS) {
      const aliases = STACK_MAP.flatMap((e) => e.aliases).filter((a) => a.startsWith(`${ecosystem}:`));
      expect(aliases.length, ecosystem).toBeGreaterThanOrEqual(5);
    }
  });
});

describe("lookup", () => {
  it.each([
    ["npm:react-dom", "react"],
    ["npm:@radix-ui/react-dialog", "radix-ui"],
    ["npm:@nestjs/core", "nestjs"],
    ["go:github.com/labstack/echo/v4", "echo"],
    ["go:github.com/jackc/pgx/v5", "postgres"],
    ["gem:aws-sdk-s3", "aws"],
    ["docker:postgres", "postgres"],
    ["tool:pnpm-workspace", "pnpm-workspaces"],
  ])("%s → %s", (signalId, id) => {
    expect(lookup(signalId)?.id).toBe(id);
  });

  it("keeps ecosystems apart", () => {
    expect(lookup("pypi:redis")?.id).toBe("redis");
    expect(lookup("npm:requests")).toBeUndefined();
    expect(lookup("pypi:requests")?.id).toBe("requests");
  });

  it("denies noise by pattern", () => {
    expect(isDenied("npm:@types/node")).toBe(true);
    expect(isDenied("npm:@vitejs/eslint-plugin")).toBe(true);
    expect(isDenied("action:actions/checkout")).toBe(true);
    expect(isDenied("npm:eslint")).toBe(false);
  });
});

// The signals that make each fixture's card what it is. Nine repos are a checklist,
// not the map's scope: the map is sized to each ecosystem's head, and this checks it.
const IMPORTANT: Record<string, string[]> = {
  Grandbusta__spyde: [
    "npm:pdfkit", "npm:vitepress", "npm:typescript", "tool:node", "tool:npm",
    "tool:github-actions", "action:actions/deploy-pages",
  ],
  "vercel__next.js": [
    "npm:next", "npm:react", "tool:pnpm-workspace", "tool:turborepo", "tool:lerna", "tool:node",
    "npm:typescript", "npm:jest", "npm:playwright", "npm:tailwindcss", "npm:webpack", "npm:eslint",
    "npm:prettier", "tool:rust", "cargo:napi", "cargo:swc_core", "cargo:tokio", "tool:github-actions",
  ],
  "fastapi__full-stack-fastapi-template": [
    "pypi:fastapi", "pypi:sqlmodel", "pypi:alembic", "pypi:psycopg", "pypi:pydantic", "pypi:pytest",
    "pypi:ruff", "pypi:mypy", "pypi:sentry-sdk", "tool:python", "tool:uv", "tool:bun", "npm:react",
    "npm:vite", "npm:tailwindcss", "npm:typescript", "npm:zod", "npm:@tanstack/react-query",
    "npm:@tanstack/react-router", "npm:react-hook-form", "tool:github-actions",
  ],
  pocketbase__pocketbase: [
    "tool:go", "go:modernc.org/sqlite", "go:github.com/spf13/cobra", "npm:vite", "npm:leaflet",
    "action:goreleaser/goreleaser-action", "tool:github-actions",
  ],
  "astral-sh__uv": [
    "tool:rust", "tool:python", "tool:uv", "cargo:tokio", "cargo:clap", "cargo:serde", "cargo:insta",
    "pypi:ruff", "pypi:mkdocs", "tool:docker", "tool:github-actions",
  ],
  mastodon__mastodon: [
    "gem:rails", "gem:sidekiq", "gem:puma", "gem:pg", "gem:redis", "gem:devise", "gem:rspec-rails",
    "gem:rubocop", "gem:chewy", "gem:opentelemetry-sdk", "npm:react", "npm:react-redux", "npm:vite",
    "npm:typescript", "npm:vitest", "npm:storybook", "npm:sass", "npm:express", "npm:pg", "npm:ioredis",
    "npm:playwright", "docker:postgres", "docker:redis", "docker:node", "docker:ruby", "tool:docker",
    "tool:yarn", "tool:node", "tool:ruby", "tool:github-actions",
  ],
  laravel__laravel: [
    "composer:laravel/framework", "tool:php", "composer:phpunit/phpunit", "composer:laravel/pint",
    "npm:vite", "npm:tailwindcss", "npm:laravel-vite-plugin",
  ],
  github__gitignore: ["tool:github-actions"],
};

describe("fixture coverage", () => {
  it.each(Object.entries(IMPORTANT))("%s: important signals are emitted and mapped", (fixture, important) => {
    const emitted = new Set(detect(recordedManifests(fixture), recordedRootPaths(fixture)).map((s) => s.id));
    for (const id of important) {
      expect(emitted.has(id), `${fixture} doesn't emit ${id}`).toBe(true);
      expect(lookup(id), `${fixture}: ${id} is unmapped`).toBeDefined();
    }
  });
});
