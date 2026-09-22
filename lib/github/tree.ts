import { z } from "zod";
import type { Result } from "@/lib/result";
import type { GitHubClient, GitHubError } from "@/lib/github/client";
import type { RepoHead } from "@/lib/github/repo";

export type TreeEntry = { path: string; sha: string; size: number };

export type Tree = {
  entries: TreeEntry[];
  // Truncated recursive listing, topped up with the root entries from call 1.
  partial: boolean;
};

export const MANIFEST_BUDGET = 6;
// Bigger than any honest manifest; keeps a hostile one out of the function.
export const MAX_MANIFEST_BYTES = 1_000_000;

const LANGUAGE_MANIFESTS = [
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
];
const NESTED_MANIFESTS = new Set(["package.json", ...LANGUAGE_MANIFESTS]);
const ROOT_CONTAINER_MANIFESTS = ["Dockerfile", "docker-compose.yml"];
const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;

// Demo and test apps would otherwise take the package.json slots: in vercel/next.js,
// examples/ sorts before packages/ at the same depth. docs/ is deliberately allowed.
const DENIED_SEGMENTS = new Set([
  "node_modules",
  "examples",
  "example",
  "fixtures",
  "test",
  "tests",
  "__tests__",
  "e2e",
  "samples",
  "demo",
  "templates",
  "bench",
  "vendor",
]);

const TreeResponseSchema = z.object({
  truncated: z.boolean(),
  tree: z.array(
    z.object({ path: z.string(), type: z.string(), sha: z.string(), size: z.number().optional() }),
  ),
});

/** GitHub API call 2 of 2: every path in the repo at the pinned commit. */
export async function fetchTree(
  client: GitHubClient,
  head: RepoHead,
): Promise<Result<Tree, GitHubError>> {
  const path = `/repos/${enc(head.owner)}/${enc(head.repo)}/git/trees/${head.treeOid}?recursive=1`;
  const res = await client.rest(path, TreeResponseSchema);
  if (!res.ok) return res;

  const entries = res.value.tree
    .filter((e) => e.type === "blob")
    .map((e) => ({ path: e.path, sha: e.sha, size: e.size ?? 0 }));
  if (!res.value.truncated) return { ok: true, value: { entries, partial: false } };

  const seen = new Set(entries.map((e) => e.path));
  const missingRoot = head.rootEntries.filter((e) => !seen.has(e.path));
  return { ok: true, value: { entries: [...entries, ...missingRoot], partial: true } };
}

/** Picks at most six manifests, in ARCHITECTURE.md's priority order. */
export function selectManifests(entries: TreeEntry[]): TreeEntry[] {
  const eligible = entries
    .filter((e) => e.size <= MAX_MANIFEST_BYTES && !hasDeniedSegment(e.path))
    .sort((a, b) => depth(a.path) - depth(b.path) || compare(a.path, b.path));
  const at = (path: string) => eligible.filter((e) => e.path === path);

  const ordered = [
    ...at("package.json"),
    ...LANGUAGE_MANIFESTS.flatMap(at),
    ...ROOT_CONTAINER_MANIFESTS.flatMap(at),
    ...eligible.filter((e) => WORKFLOW.test(e.path)).slice(0, 1),
    // Nested language manifests share the package.json pool, or a Python backend beside
    // a JS frontend never gets read. ADR-0001, GOTCHAS 026.
    ...eligible.filter((e) => depth(e.path) > 1 && NESTED_MANIFESTS.has(basename(e.path))),
  ];
  return ordered.slice(0, MANIFEST_BUDGET);
}

function hasDeniedSegment(path: string): boolean {
  return path
    .split("/")
    .slice(0, -1)
    .some((segment) => DENIED_SEGMENTS.has(segment.toLowerCase()));
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function depth(path: string): number {
  return path.split("/").length;
}

// Code-unit order, not localeCompare: selection must not vary with the host locale.
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function enc(segment: string): string {
  return encodeURIComponent(segment);
}
