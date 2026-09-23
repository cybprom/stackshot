import { describe, expect, it } from "vitest";
import type { RawSignal } from "@/lib/stack-map/types";
import { detect } from "@/lib/detect";
import { detectDocker } from "@/lib/detect/dockerfile";
import { detectGo } from "@/lib/detect/go";
import { parseImageRef } from "@/lib/detect/image-ref";
import { detectPackageJson } from "@/lib/detect/package-json";
import { detectPaths } from "@/lib/detect/paths";
import { detectPhp } from "@/lib/detect/php";
import { detectPython } from "@/lib/detect/python";
import { detectRuby } from "@/lib/detect/ruby";
import { detectRust } from "@/lib/detect/rust";
import { detectWorkflows } from "@/lib/detect/workflows";
import { recordedManifest, recordedManifests, recordedRootPaths } from "@/tests/helpers/manifests";

type Detector = (contents: string, path: string) => RawSignal[];

// "id@version", or bare "id" when the signal carries no version.
const tags = (signals: RawSignal[]) => signals.map((s) => (s.rawVersion ? `${s.id}@${s.rawVersion}` : s.id));
const run = (detector: Detector, contents: string, path: string) => tags(detector(contents, path));
// Snapshots also record scope, so a scope change shows up in review.
const scopedTags = (signals: RawSignal[]) =>
  signals.map((s) => `${s.rawVersion ? `${s.id}@${s.rawVersion}` : s.id}${s.scope === "dev" ? " [dev]" : ""}`);
const scopeOf = (signals: RawSignal[], id: string) => signals.filter((s) => s.id === id).map((s) => s.scope);
const real = (detector: Detector, fixture: string, path: string) =>
  run(detector, recordedManifest(fixture, path), path);

// [name, detector, fixture, path, must contain, must not contain]
type RealCase = [string, Detector, string, string, string[], string[]];

const REAL: RealCase[] = [
  ["spyde package.json", detectPackageJson, "Grandbusta__spyde", "package.json",
    ["tool:node@>=20"], ["npm:@grandbusta/spyde"]],
  ["next.js root package.json: engines and packageManager", detectPackageJson, "vercel__next.js", "package.json",
    ["tool:node@>=20.9.0", "tool:pnpm@10.33.0"], []],
  ["fastapi backend pyproject: PEP 621, extras, groups, requires-python", detectPython,
    "fastapi__full-stack-fastapi-template", "backend/pyproject.toml",
    ["pypi:fastapi@>=0.141.1,<1.0.0", "pypi:psycopg@>=3.3.4,<4.0.0", "pypi:pytest@<10.0.0,>=7.4.3", "tool:python@>=3.14,<4.0"],
    ["pypi:hatchling"]],
  ["pocketbase go.mod: direct requires only", detectGo, "pocketbase__pocketbase", "go.mod",
    ["tool:go@1.27", "go:github.com/spf13/cobra@v1.10.2", "go:github.com/golang-jwt/jwt/v5@v5.3.1"], []],
  ["uv Cargo.toml: workspace deps, own crates skipped", detectRust, "astral-sh__uv", "Cargo.toml",
    ["tool:rust@1.96.0"], ["cargo:uv", "cargo:uv-auth"]],
  ["mastodon Gemfile", detectRuby, "mastodon__mastodon", "Gemfile",
    ["gem:rails@~> 8.1.0", "gem:puma", "gem:pg@~> 1.5", "tool:ruby@>= 3.3.0"], []],
  ["laravel composer.json", detectPhp, "laravel__laravel", "composer.json",
    ["tool:php@^8.3", "composer:laravel/framework@^13.17", "composer:phpunit/phpunit@^12.5.12"], []],
  ["mastodon Dockerfile: ARG defaults resolve registry and tag, stages skipped", detectDocker,
    "mastodon__mastodon", "Dockerfile",
    ["docker:node@24-trixie-slim", "docker:ruby@4.0.7-slim-trixie"], ["docker:media-build", "docker:ruby-build"]],
  ["mastodon compose", detectDocker, "mastodon__mastodon", "docker-compose.yml",
    ["docker:postgres@14-alpine", "docker:redis@7-alpine"], []],
  ["mastodon workflow: SHA-pinned actions", detectWorkflows, "mastodon__mastodon",
    ".github/workflows/build-container-image.yml",
    ["action:docker/build-push-action", "action:actions/checkout"], []],
  ["pocketbase workflow: tag-pinned actions", detectWorkflows, "pocketbase__pocketbase", ".github/workflows/release.yaml",
    ["action:actions/setup-go", "action:goreleaser/goreleaser-action"], []],
  ["laravel workflow: reusable workflow is not an action", detectWorkflows, "laravel__laravel",
    ".github/workflows/dependabot-auto-merge.yml", [], ["action:laravel/.github"]],
];

describe("detectors against recorded manifests", () => {
  it.each(REAL)("%s", (_name, detector, fixture, path, present, absent) => {
    const out = real(detector, fixture, path);
    for (const tag of present) expect(out).toContain(tag);
    for (const tag of absent) expect(out.some((t) => t === tag || t.startsWith(`${tag}@`))).toBe(false);
  });

  it("skips every // indirect require in pocketbase", () => {
    const contents = recordedManifest("pocketbase__pocketbase", "go.mod");
    const indirect = contents.split("\n").filter((l) => l.includes("// indirect")).map((l) => l.trim().split(/\s+/)[0]);
    expect(indirect.length).toBeGreaterThan(0);
    const ids = detectGo(contents, "go.mod").map((s) => s.id);
    for (const mod of indirect) expect(ids).not.toContain(`go:${mod}`);
  });

  it("gives manifests confidence 2 and Docker/CI signals confidence 1", () => {
    const signals = detect(recordedManifests("mastodon__mastodon"), []);
    for (const s of signals) {
      const inferred = /^(docker:|action:|tool:docker$|tool:github-actions$)/.test(s.id);
      expect(s.confidence).toBe(inferred ? 1 : 2);
    }
  });
});

// [name, detector, path, contents, expected exactly]
type EdgeCase = [string, Detector, string, string, string[]];

const EDGE: EdgeCase[] = [
  ["package.json: local protocols are the repo's own packages", detectPackageJson, "package.json",
    '{"dependencies":{"a":"workspace:*","b":"file:../b","c":"link:../c","react":"^19.0.0"}}', ["npm:react@^19.0.0"]],
  ["package.json: dependencies win over devDependencies for the range", detectPackageJson, "package.json",
    '{"devDependencies":{"vite":"^5"},"dependencies":{"vite":"^6"}}', ["npm:vite@^6"]],
  ["package.json: a malformed section doesn't lose the rest", detectPackageJson, "package.json",
    '{"dependencies":[1,2],"devDependencies":{"vitest":"^5"}}', ["npm:vitest@^5"]],
  ["package.json: invalid JSON", detectPackageJson, "package.json", "{nope", []],
  ["requirements.txt: comments, options, extras, markers, URLs", detectPython, "requirements.txt",
    [
      "# comment",
      "-r base.txt",
      "--index-url https://example.com",
      "Django==5.1.2  # pinned",
      "celery[redis]>=5.3",
      "Flask_Login ; python_version >= '3.8'",
      "git+https://github.com/a/b.git",
      "",
    ].join("\n"),
    ["pypi:django@==5.1.2", "pypi:celery@>=5.3", "pypi:flask-login"]],
  ["pyproject: Poetry tables, python key is the runtime", detectPython, "pyproject.toml",
    [
      "[tool.poetry.dependencies]",
      'python = "^3.12"',
      'Django = "^5.0"',
      'celery = { version = "^5.3", extras = ["redis"] }',
      "[tool.poetry.group.dev.dependencies]",
      'pytest = "^8"',
    ].join("\n"),
    ["tool:python@^3.12", "pypi:django@^5.0", "pypi:celery@^5.3", "pypi:pytest@^8"]],
  ["pyproject: PEP 735 include-group tables are skipped", detectPython, "pyproject.toml",
    '[dependency-groups]\ndev = ["ruff>=0.5", { include-group = "test" }]\ntest = ["pytest"]',
    ["pypi:ruff@>=0.5", "pypi:pytest"]],
  ["pyproject: invalid TOML", detectPython, "pyproject.toml", "[project\n", []],
  ["go.mod: single-line require and indirect", detectGo, "go.mod",
    "module x\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.1\nrequire golang.org/x/text v0.14.0 // indirect\n",
    ["tool:go@1.22", "go:github.com/gin-gonic/gin@v1.9.1"]],
  ["Cargo.toml: renamed package, target tables, path deps", detectRust, "Cargo.toml",
    [
      "[package]",
      'rust-version = "1.80"',
      "[dependencies]",
      'serde = "1"',
      'tokio = { version = "1.38", features = ["full"] }',
      'web = { package = "axum", version = "0.7" }',
      'local = { path = "../local" }',
      "[target.'cfg(unix)'.dependencies]",
      'nix = "0.29"',
    ].join("\n"),
    ["cargo:serde@1", "cargo:tokio@1.38", "cargo:axum@0.7", "cargo:nix@0.29", "tool:rust@1.80"]],
  ["Gemfile: gem without version, options after name", detectRuby, "Gemfile",
    "gem \"sidekiq\"\ngem 'rspec-rails', group: :test\nruby file: '.ruby-version'\n",
    ["gem:sidekiq", "gem:rspec-rails"]],
  ["composer.json: platform packages dropped", detectPhp, "composer.json",
    '{"require":{"php":">=8.2","ext-json":"*","lib-pcre":"*","composer-plugin-api":"^2","Symfony/Console":"^7"}}',
    ["composer:symfony/console@^7", "tool:php@>=8.2"]],
  ["Dockerfile: platform flag, digest, scratch, unresolved ARG", detectDocker, "Dockerfile",
    [
      "FROM --platform=$BUILDPLATFORM golang:1.23-alpine@sha256:abc AS build",
      "FROM build AS test",
      "FROM ${UNSET_IMAGE}",
      "ARG TAG",
      "FROM gcr.io/distroless/static:${TAG}",
      "FROM scratch",
    ].join("\n"),
    ["tool:docker", "docker:golang@1.23-alpine", "docker:gcr.io/distroless/static"]],
  ["compose: ${VAR:-default} and quoted images", detectDocker, "docker-compose.yml",
    'services:\n  db:\n    image: "postgres:${PG:-16}"\n  cache:\n    image: redis\n',
    ["tool:docker", "docker:postgres@16", "docker:redis"]],
  ["workflow: setup versions, but only real pins and named toolchains", detectWorkflows, ".github/workflows/ci.yml",
    [
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - uses: actions/setup-go@v5",
      "        with:",
      "          go-version: '>=1.27.1'",
      "      - uses: actions/setup-python@v5",
      "        with:",
      "          python-version: ${{ matrix.python }}",
      "      - uses: oven-sh/setup-bun@v2",
      "        with:",
      "          bun-version: 'latest'",
      "      - uses: astral-sh/setup-uv@v6",
      "        with:",
      "          version: '0.12.13'",
    ].join("\n"),
    [
      "tool:github-actions", "action:actions/setup-node", "tool:node@20", "action:actions/setup-go",
      "tool:go@>=1.27.1", "action:actions/setup-python", "tool:python", "action:oven-sh/setup-bun",
      "tool:bun", "action:astral-sh/setup-uv",
    ]],
  ["workflow: lts/* is not a version", detectWorkflows, ".github/workflows/ci.yml",
    "      - uses: actions/setup-node@v6\n        with:\n          node-version: 'lts/*'",
    ["tool:github-actions", "action:actions/setup-node", "tool:node"]],
  ["workflow: local actions, docker://, subpath actions, services", detectWorkflows, ".github/workflows/ci.yml",
    [
      "    steps:",
      "      - uses: ./.github/actions/setup",
      "      - uses: docker://alpine:3.20",
      "      - uses: github/codeql-action/init@v3",
      "    container: node:22",
      "    services:",
      "      db:",
      "        image: postgres:16",
    ].join("\n"),
    ["tool:github-actions", "docker:alpine@3.20", "action:github/codeql-action", "docker:node@22", "docker:postgres@16"]],
];

describe("detector edge cases", () => {
  it.each(EDGE)("%s", (_name, detector, path, contents, expected) => {
    expect(run(detector, contents, path).sort()).toEqual([...expected].sort());
  });
});

describe("scope", () => {
  // [name, detector, path, contents, id, expected scopes]
  const cases: [string, Detector, string, string, string, string[]][] = [
    ["npm dependencies ship", detectPackageJson, "package.json", '{"dependencies":{"pg":"^8"}}', "npm:pg", ["runtime"]],
    ["npm devDependencies don't", detectPackageJson, "package.json", '{"devDependencies":{"pg":"^8"}}', "npm:pg", ["dev"]],
    ["npm: in both sections is runtime", detectPackageJson, "package.json",
      '{"devDependencies":{"pg":"^7"},"dependencies":{"pg":"^8"}}', "npm:pg", ["runtime"]],
    ["npm: engines is the runtime", detectPackageJson, "package.json", '{"engines":{"node":">=20"}}', "tool:node", ["runtime"]],
    ["npm: packageManager is tooling", detectPackageJson, "package.json", '{"packageManager":"pnpm@10.1.0"}', "tool:pnpm", ["dev"]],
    ["pyproject: a feature extra ships", detectPython, "pyproject.toml",
      '[project.optional-dependencies]\npostgres = ["psycopg"]', "pypi:psycopg", ["runtime"]],
    ["pyproject: a test extra doesn't", detectPython, "pyproject.toml",
      '[project.optional-dependencies]\ntest = ["psycopg"]', "pypi:psycopg", ["dev"]],
    ["pyproject: PEP 735 groups are dev", detectPython, "pyproject.toml",
      '[dependency-groups]\nci = ["psycopg"]', "pypi:psycopg", ["dev"]],
    ["pyproject: Poetry groups are dev", detectPython, "pyproject.toml",
      '[tool.poetry.group.docs.dependencies]\nmkdocs = "^1"', "pypi:mkdocs", ["dev"]],
    ["Cargo: dev- and build-dependencies are dev", detectRust, "Cargo.toml",
      '[dependencies]\nserde = "1"\n[dev-dependencies]\ninsta = "1"\n[build-dependencies]\ncc = "1"',
      "cargo:insta", ["dev"]],
    ["Cargo: target-specific dev-dependencies are dev", detectRust, "Cargo.toml",
      "[target.'cfg(unix)'.dev-dependencies]\nnix = \"0.29\"", "cargo:nix", ["dev"]],
    ["composer: require-dev is dev", detectPhp, "composer.json",
      '{"require":{"laravel/framework":"^11"},"require-dev":{"phpunit/phpunit":"^11"}}', "composer:phpunit/phpunit", ["dev"]],
    ["Dockerfile images ship", detectDocker, "Dockerfile", "FROM node:22", "docker:node", ["runtime"]],
    ["workflow service containers are CI fixtures", detectWorkflows, ".github/workflows/ci.yml",
      "    services:\n      db:\n        image: postgres:16", "docker:postgres", ["dev"]],
    ["Gemfile groups aren't tracked, so runtime", detectRuby, "Gemfile",
      "group :test do\n  gem 'rspec-rails'\nend", "gem:rspec-rails", ["runtime"]],
  ];

  it.each(cases)("%s", (_name, detector, path, contents, id, expected) => {
    expect(scopeOf(detector(contents, path), id)).toEqual(expected);
  });

  it("next.js's root package.json is all devDependencies", () => {
    const signals = detectPackageJson(recordedManifest("vercel__next.js", "package.json"), "package.json");
    expect(new Set(signals.filter((s) => s.id.startsWith("npm:")).map((s) => s.scope))).toEqual(new Set(["dev"]));
    expect(scopeOf(signals, "npm:firebase")).toEqual(["dev"]);
  });

  it("fastapi's backend ships FastAPI and develops with pytest", () => {
    const path = "backend/pyproject.toml";
    const signals = detectPython(recordedManifest("fastapi__full-stack-fastapi-template", path), path);
    expect(scopeOf(signals, "pypi:fastapi")).toEqual(["runtime"]);
    expect(scopeOf(signals, "pypi:pytest")).toEqual(["dev"]);
  });
});

describe("parseImageRef", () => {
  it.each([
    ["postgres", { name: "postgres" }],
    ["docker.io/postgres:16", { name: "postgres", tag: "16" }],
    ["docker.io/library/postgres:16", { name: "postgres", tag: "16" }],
    ["index.docker.io/library/postgres", { name: "postgres" }],
    ["library/postgres:16-alpine", { name: "postgres", tag: "16-alpine" }],
    ["bitnami/redis:7", { name: "bitnami/redis", tag: "7" }],
    ["ghcr.io/owner/app:v1", { name: "ghcr.io/owner/app", tag: "v1" }],
    ["localhost:5000/app:1", { name: "localhost:5000/app", tag: "1" }],
    ["Node:22@sha256:0123", { name: "node", tag: "22" }],
  ])("%s", (ref, expected) => {
    expect(parseImageRef(ref)).toEqual(expected);
  });
});

describe("detectPaths", () => {
  it("reads monorepo configs and lockfiles at the root only", () => {
    const paths = ["pnpm-lock.yaml", "turbo.json", "examples/a/yarn.lock", "examples/b/bun.lockb", "README.md"];
    expect(tags(detectPaths(paths))).toEqual(["tool:pnpm", "tool:turborepo"]);
  });

  it("never opens a lockfile: it takes paths, not contents", () => {
    expect(detectPaths.length).toBe(1);
  });
});

const FIXTURES = [
  "Grandbusta__spyde",
  "vercel__next.js",
  "fastapi__full-stack-fastapi-template",
  "pocketbase__pocketbase",
  "astral-sh__uv",
  "mastodon__mastodon",
  "laravel__laravel",
  "github__gitignore",
  "jlevy__the-art-of-command-line",
  "pmndrs__zustand",
];

describe("detect over each fixture repo", () => {
  it.each(FIXTURES)("%s", (fixture) => {
    const signals = detect(recordedManifests(fixture), recordedRootPaths(fixture));
    expect([...new Set(scopedTags(signals))].sort()).toMatchSnapshot();
  });

  it("finds nothing in a repo with no manifests and no workflows", () => {
    const fixture = "jlevy__the-art-of-command-line";
    expect(detect(recordedManifests(fixture), recordedRootPaths(fixture))).toEqual([]);
  });

  it("finds only CI signals in github/gitignore", () => {
    const signals = detect(recordedManifests("github__gitignore"), recordedRootPaths("github__gitignore"));
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((s) => s.id.startsWith("action:") || s.id === "tool:github-actions")).toBe(true);
  });
});
