import { describe, expect, it } from "vitest";
import { createGitHubClient } from "@/lib/github/client";
import { fetchRepoHead } from "@/lib/github/repo";
import { fetchTree, MAX_MANIFEST_BYTES, selectManifests, type TreeEntry } from "@/lib/github/tree";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";
import { recordedManifests } from "@/tests/helpers/manifests";

async function tree(fixture: string) {
  const client = createGitHubClient({ token: "t", fetch: fixtureFetch(loadResponses(fixture)) });
  const head = await fetchRepoHead(client, "Grandbusta", "spyde");
  if (!head.ok) throw new Error(JSON.stringify(head.error));
  const res = await fetchTree(client, head.value);
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  return res.value;
}

describe("fetchTree", () => {
  it("returns every blob in a complete tree", async () => {
    const t = await tree("Grandbusta__spyde");
    expect(t.partial).toBe(false);
    expect(t.entries).toHaveLength(86);
  });

  it("tops up a truncated tree with the root entries from call 1", async () => {
    const t = await tree("derived__truncated-tree");
    expect(t.partial).toBe(true);
    expect(t.entries.map((e) => e.path)).toContain("package.json");
    expect(selectManifests(t.entries)[0]?.path).toBe("package.json");
  });
});

const entry = (path: string, size = 100): TreeEntry => ({ path, sha: path, size });
const select = (paths: string[]) => selectManifests(paths.map((p) => entry(p))).map((e) => e.path);

describe("selectManifests", () => {
  const cases: [string, string[], string[]][] = [
    [
      "priority order, regardless of input order",
      ["apps/web/package.json", ".github/workflows/ci.yml", "Dockerfile", "go.mod", "package.json"],
      ["package.json", "go.mod", "Dockerfile", ".github/workflows/ci.yml", "apps/web/package.json"],
    ],
    [
      "only the first workflow, by path",
      [".github/workflows/release.yaml", ".github/workflows/ci.yml", ".github/workflows/lint.yml"],
      [".github/workflows/ci.yml"],
    ],
    [
      "nested workflows directories are not workflows",
      ["apps/x/.github/workflows/ci.yml", "src/.github/workflows/ci.yml"],
      [],
    ],
    [
      "root language manifests first, nested ones join the package.json pool",
      ["tools/go.mod", "py/pyproject.toml", "requirements.txt"],
      ["requirements.txt", "py/pyproject.toml", "tools/go.mod"],
    ],
    [
      // fastapi/full-stack-fastapi-template: no root manifests, Python only in backend/.
      "a nested Python backend is read beside a JS frontend",
      ["backend/pyproject.toml", "frontend/package.json", "docker-compose.yml", "backend/app/main.py"],
      ["docker-compose.yml", "backend/pyproject.toml", "frontend/package.json"],
    ],
    [
      "nested language manifests obey the deny list",
      ["examples/go.mod", "tests/requirements.txt", "services/api/go.mod"],
      ["services/api/go.mod"],
    ],
    [
      // vercel/next.js: .github/package.json sorted ahead of every real package.
      "dot-prefixed directories are out of the nested pool; workflows keep their own rule",
      [
        ".github/package.json",
        ".devcontainer/package.json",
        ".changeset/package.json",
        "apps/.hidden/package.json",
        ".github/workflows/ci.yml",
        "web/package.json",
      ],
      [".github/workflows/ci.yml", "web/package.json"],
    ],
    [
      "remaining package.json shallowest first, ties by path",
      ["packages/b/package.json", "packages/a/core/package.json", "packages/a/package.json", "web/package.json"],
      ["web/package.json", "packages/a/package.json", "packages/b/package.json", "packages/a/core/package.json"],
    ],
    [
      "budget of six",
      ["package.json", "go.mod", "Cargo.toml", "Dockerfile", ".github/workflows/ci.yml", "a/package.json", "b/package.json"],
      ["package.json", "go.mod", "Cargo.toml", "Dockerfile", ".github/workflows/ci.yml", "a/package.json"],
    ],
    [
      "docs/ is allowed",
      ["docs/package.json"],
      ["docs/package.json"],
    ],
    [
      // vercel/next.js: examples/ sorts before packages/ at the same depth.
      "Next.js-shaped repo gives its slots to packages/, not examples/",
      [
        "package.json",
        ".github/workflows/build_and_test.yml",
        "examples/blog-starter/package.json",
        "examples/with-docker/package.json",
        "examples/with-docker/Dockerfile",
        "examples/with-jest/package.json",
        "examples/with-tailwindcss/package.json",
        "packages/create-next-app/package.json",
        "packages/eslint-plugin-next/package.json",
        "packages/next/package.json",
        "packages/next-swc/package.json",
        "test/e2e/app-dir/package.json",
      ],
      [
        "package.json",
        ".github/workflows/build_and_test.yml",
        "packages/create-next-app/package.json",
        "packages/eslint-plugin-next/package.json",
        // Code-unit order: "-" sorts before "/".
        "packages/next-swc/package.json",
        "packages/next/package.json",
      ],
    ],
  ];

  it.each(cases)("%s", (_name, input, expected) => {
    expect(select(input)).toEqual(expected);
  });

  it.each([
    "node_modules", "examples", "example", "fixtures", "test", "tests", "__tests__",
    "e2e", "samples", "demo", "templates", "bench", "vendor", "Examples",
  ])("drops package.json under %s/", (segment) => {
    expect(select([`${segment}/package.json`, `pkg/${segment}/app/package.json`])).toEqual([]);
  });

  it("judges only directories, so a file named like a denied segment is fine", () => {
    expect(select(["test/package.json", "packages/test-utils/package.json"])).toEqual([
      "packages/test-utils/package.json",
    ]);
  });

  it("drops blobs over the size cap", () => {
    const big = entry("package.json", MAX_MANIFEST_BYTES + 1);
    expect(selectManifests([big, entry("go.mod")]).map((e) => e.path)).toEqual(["go.mod"]);
  });
});

// A selection change must re-record the fixtures it affects, or detection tests run on
// manifests the resolver would no longer fetch.
describe("recorded fixtures match current selection", () => {
  it.each([
    "Grandbusta__spyde",
    "vercel__next.js",
    "fastapi__full-stack-fastapi-template",
    "pocketbase__pocketbase",
    "astral-sh__uv",
    "mastodon__mastodon",
    "laravel__laravel",
    "github__gitignore",
    "jlevy__the-art-of-command-line",
  ])("%s", async (fixture) => {
    const [owner = "", repo = ""] = fixture.split("__");
    const client = createGitHubClient({ token: "t", fetch: fixtureFetch(loadResponses(fixture)) });
    const head = await fetchRepoHead(client, owner, repo);
    if (!head.ok) throw new Error(JSON.stringify(head.error));
    const tree = await fetchTree(client, head.value);
    if (!tree.ok) throw new Error(JSON.stringify(tree.error));
    const selected = selectManifests(tree.value.entries).map((e) => e.path);
    expect(recordedManifests(fixture).map((f) => f.path).sort()).toEqual([...selected].sort());
  });
});
