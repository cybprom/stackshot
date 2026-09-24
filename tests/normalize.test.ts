import { describe, expect, it } from "vitest";
import type { RawSignal, Scope, StackContent } from "@/lib/stack-map/types";
import { normalize } from "@/lib/normalize";

const META = { owner: "o", repo: "r", language: "TypeScript", stars: 1 };

// "npm:react@^19" or "npm:react@^19 [dev]". Inferred signals — images, actions, and the
// "uses Docker/Actions" facts — carry confidence 1, exactly as the detectors emit them.
function sig(tag: string): RawSignal {
  const dev = tag.endsWith(" [dev]");
  const bare = dev ? tag.slice(0, -" [dev]".length) : tag;
  const at = bare.indexOf("@", bare.indexOf(":") + 2);
  const id = at === -1 ? bare : bare.slice(0, at);
  const rawVersion = at === -1 ? undefined : bare.slice(at + 1);
  const scope: Scope = dev ? "dev" : "runtime";
  const confidence = /^(docker:|action:|tool:docker$|tool:github-actions$)/.test(id) ? 1 : 2;
  return rawVersion ? { id, rawVersion, source: "test", confidence, scope } : { id, source: "test", confidence, scope };
}

const run = (tags: string[]) => normalize(tags.map(sig), META);
// "frontend: Next.js 15, Tailwind 4" per layer, for readable expectations.
const card = (doc: StackContent) =>
  doc.layers.map(
    (l) =>
      `${l.category}: ${l.items.map((i) => (i.version ? `${i.display} ${i.version}` : i.display)).join(", ")}` +
      (l.overflow ? ` +${l.overflow}` : ""),
  );

describe("normalize", () => {
  it("drops denied signals without logging them, and logs unmapped ones", () => {
    const doc = run(["npm:@types/node", "action:actions/checkout", "npm:left-pad", "npm:react@^19"]);
    expect(card(doc)).toEqual(["frontend: React 19"]);
    expect(doc.unmapped).toEqual(["npm:left-pad"]);
  });

  it("suppresses what a framework makes redundant", () => {
    expect(card(run(["npm:next@^15.1.0", "npm:react@^19", "npm:react-dom@^19"]))).toEqual(["frontend: Next.js 15"]);
    expect(card(run(["npm:tailwindcss@^4", "npm:postcss@^8", "npm:autoprefixer@^10"]))).toEqual(["frontend: Tailwind 4"]);
  });

  it("merges every signal for one entry into one item", () => {
    const doc = run(["tool:node@>=20", "docker:node@24-alpine", "action:actions/setup-node [dev]"]);
    expect(card(doc)).toEqual(["backend: Node 24"]);
  });

  it("uses minor precision for Go, Python and Rust", () => {
    const doc = run(["tool:go@1.27", "tool:python@3.14.1", "tool:rust@1.96.0", "tool:ruby@3.3.0"]);
    expect(card(doc)).toEqual(["backend: Go 1.27, Python 3.14, Ruby 3, Rust 1.96"]);
  });

  it("drops a version backed only by floors (ADR-0019)", () => {
    expect(card(run(["tool:node@>=12.20.0"]))).toEqual(["backend: Node"]);
    expect(card(run(["tool:node@>=12.20.0", "tool:node@20"]))).toEqual(["backend: Node 20"]);
  });

  it("takes a database's version from its image, never its driver", () => {
    expect(card(run(["pypi:psycopg@>=3.3.4,<4.0.0"]))).toEqual(["backend: PostgreSQL"]);
    expect(card(run(["pypi:psycopg@>=3.3.4,<4.0.0", "docker:postgres@17"]))).toEqual(["backend: PostgreSQL 17"]);
  });

  it("shows no version for a hosted service, only for its SDK", () => {
    expect(card(run(["gem:aws-sdk-core@~> 3.1", "npm:@sentry/nextjs@^8"]))).toEqual(["infra: AWS, Sentry"]);
  });

  it("ignores a plugin's version: laravel-vite-plugin 2 isn't Vite 2", () => {
    expect(card(run(["npm:laravel-vite-plugin@^2 [dev]", "npm:vite@^7 [dev]"]))).toEqual(["tooling: Vite 7"]);
  });

  it("shows 0.x crates at their breaking minor", () => {
    expect(card(run(["cargo:axum@0.8"]))).toEqual(["backend: Axum 0.8"]);
  });

  describe("scope", () => {
    it("drops manifest-dev-only entries once the repo ships anything (ADR-0021)", () => {
      // Firebase (78) outweighs Sentry (64), but it is only a devDependency here.
      const doc = run(["npm:firebase@^10 [dev]", "npm:@sentry/nextjs@^8"]);
      expect(card(doc)).toEqual(["infra: Sentry"]);
    });

    it("keeps them when the repo declares no runtime dependency at all", () => {
      // zustand: React and Redux are devDependencies, and there is nothing else.
      const doc = run(["npm:react@^19 [dev]", "npm:redux@^5 [dev]", "tool:node@>=12.20.0"]);
      expect(card(doc)).toEqual(["frontend: React 19, Redux 5", "backend: Node"]);
    });

    it("never drops CI or Docker signals, which are inferred, not declared", () => {
      const doc = run(["npm:react@^19", "tool:github-actions [dev]", "docker:postgres@16"]);
      expect(card(doc)).toEqual(["frontend: React 19", "backend: PostgreSQL 16", "infra: GitHub Actions"]);
    });

    it("keeps an entry that has any runtime signal of its own", () => {
      const doc = run(["npm:firebase@^10 [dev]", "npm:firebase@^10", "npm:@sentry/nextjs@^8"]);
      expect(card(doc)).toEqual(["infra: Firebase, Sentry"]);
    });

    it("exempts tooling, where dev scope is normal", () => {
      const doc = run(["npm:turbo@^2 [dev]", "npm:typescript@^5"]);
      expect(card(doc)).toEqual(["tooling: Turborepo 2, TypeScript 5"]);
    });

    it("never infers a database from a dev-only driver", () => {
      expect(run(["npm:pg@^8 [dev]"]).layers).toEqual([]);
      expect(card(run(["npm:pg@^8 [dev]", "docker:postgres@16"]))).toEqual(["backend: PostgreSQL 16"]);
    });

    it("drops a CI-only service container", () => {
      expect(run(["docker:postgres@16 [dev]"]).layers).toEqual([]);
    });
  });

  it("ranks by weight, then confidence, then id", () => {
    // Vite 76 > Vitest 64 > Jest 62.
    const doc = run(["npm:jest@^29 [dev]", "npm:vite@^6 [dev]", "npm:vitest@^3 [dev]"]);
    expect(card(doc)).toEqual(["tooling: Vite 6, Vitest 3, Jest 29"]);
  });

  it("keeps six items per layer and counts the rest as overflow (I4)", () => {
    const doc = run([
      "npm:vite", "npm:vitest", "npm:jest", "npm:playwright", "npm:storybook",
      "npm:eslint", "npm:prettier", "npm:typescript",
    ].map((t) => `${t}@^1 [dev]`));
    const tooling = doc.layers.find((l) => l.category === "tooling");
    expect(tooling?.items).toHaveLength(6);
    expect(tooling?.overflow).toBe(2);
  });

  it("orders layers frontend, backend, infra, tooling and omits empty ones", () => {
    const doc = run(["npm:vitest@^3 [dev]", "tool:github-actions [dev]", "npm:react@^19"]);
    expect(doc.layers.map((l) => l.category)).toEqual(["frontend", "infra", "tooling"]);
  });

  it("never writes an undefined version key, since the doc is hashed", () => {
    const item = run(["tool:github-actions [dev]"]).layers[0]?.items[0];
    expect(item).toBeDefined();
    expect(Object.keys(item ?? {})).not.toContain("version");
  });

  it("is order-independent", () => {
    const tags = ["npm:next@^15", "npm:react@^19", "npm:pg@^8", "tool:node@>=20", "npm:vitest@^3 [dev]", "npm:x"];
    expect(run(tags)).toEqual(run([...tags].reverse()));
  });

  it("returns an empty stack, not an error, when nothing maps", () => {
    const doc = run(["npm:left-pad", "npm:is-odd"]);
    expect(doc.layers).toEqual([]);
    expect(doc.unmapped).toEqual(["npm:is-odd", "npm:left-pad"]);
  });
});
