import type { Result } from "@/lib/result";
import type { StackDoc } from "@/lib/stack-map/types";
import type { GitHubClient, GitHubError } from "@/lib/github/client";
import { fetchManifest } from "@/lib/github/raw";
import { fetchRepoHead } from "@/lib/github/repo";
import { fetchTree, selectManifests } from "@/lib/github/tree";
import { detect, type ManifestFile } from "@/lib/detect";
import { normalize } from "@/lib/normalize";

/**
 * Per-phase wall-clock, filled in as the resolve runs. "Timed out" does not say which
 * limit to change — the 2.5s per fetch or the 4s overall — so every phase is recorded,
 * on failure as much as on success. GOTCHAS 027, 042.
 */
export type Phase = { name: string; ms: number };

async function timed<T>(phases: Phase[], name: string, run: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await run();
  } finally {
    phases.push({ name, ms: Math.round(performance.now() - started) });
  }
}

export type Resolved = {
  doc: StackDoc;
  // For the KV repo pointer: { sha, stackHash }.
  commitOid: string;
  // The tree was truncated and topped up from the root listing. GOTCHAS 006.
  partial: boolean;
};

export type ResolveError =
  | GitHubError
  | { kind: "no_manifests" }
  | { kind: "nothing_mapped"; unmapped: string[] };

/** The whole network phase and the pure phase after it, for one repo. Two API calls. */
export async function resolve(
  client: GitHubClient,
  owner: string,
  repo: string,
  phases: Phase[] = [],
): Promise<Result<Resolved, ResolveError>> {
  const started = performance.now();
  const total = () => phases.push({ name: "total", ms: Math.round(performance.now() - started) });

  const head = await timed(phases, "graphql", () => fetchRepoHead(client, owner, repo));
  if (!head.ok) {
    total();
    const { error } = head;
    return { ok: false, error: error.kind === "empty_repo" ? { kind: "no_manifests" } : error };
  }
  const tree = await timed(phases, "tree", () => fetchTree(client, head.value));
  if (!tree.ok) {
    total();
    return tree;
  }

  const fetched = await timed(phases, "raw", () =>
    Promise.all(
      selectManifests(tree.value.entries).map(async (entry) => ({
        entry,
        file: await timed(phases, `raw:${entry.path}`, () => fetchManifest(client, head.value, entry)),
      })),
    ),
  );
  const files: ManifestFile[] = [];
  for (const { entry, file } of fetched) {
    if (file.ok) files.push({ path: entry.path, contents: file.value });
    // Anything but a 404 means the manifest set is incomplete, and a partial stack
    // cached under its content hash would be served for 30 days.
    else if (file.error.kind !== "not_found") {
      total();
      return file;
    }
  }

  const signals = detect(files, tree.value.entries.map((e) => e.path));
  if (signals.length === 0) {
    total();
    return { ok: false, error: { kind: "no_manifests" } };
  }

  const { owner: o, repo: r, language, stars } = head.value;
  const doc = normalize(signals, { owner: o, repo: r, language, stars });
  total();
  if (doc.layers.length === 0) return { ok: false, error: { kind: "nothing_mapped", unmapped: doc.unmapped } };

  return { ok: true, value: { doc, commitOid: head.value.commitOid, partial: tree.value.partial } };
}
