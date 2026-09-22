import type { Result } from "@/lib/result";
import type { StackContent } from "@/lib/stack-map/types";
import type { GitHubClient, GitHubError } from "@/lib/github/client";
import { fetchManifest } from "@/lib/github/raw";
import { fetchRepoHead } from "@/lib/github/repo";
import { fetchTree, selectManifests } from "@/lib/github/tree";
import { detect, type ManifestFile } from "@/lib/detect";
import { normalize } from "@/lib/normalize";

export type Resolved = {
  doc: StackContent;
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
export async function resolve(client: GitHubClient, owner: string, repo: string): Promise<Result<Resolved, ResolveError>> {
  const head = await fetchRepoHead(client, owner, repo);
  if (!head.ok) {
    const { error } = head;
    return { ok: false, error: error.kind === "empty_repo" ? { kind: "no_manifests" } : error };
  }
  const tree = await fetchTree(client, head.value);
  if (!tree.ok) return tree;

  const fetched = await Promise.all(
    selectManifests(tree.value.entries).map(async (entry) => ({ entry, file: await fetchManifest(client, head.value, entry) })),
  );
  const files: ManifestFile[] = [];
  for (const { entry, file } of fetched) {
    if (file.ok) files.push({ path: entry.path, contents: file.value });
    // Anything but a 404 means the manifest set is incomplete, and a partial stack
    // cached under its content hash would be served for 30 days.
    else if (file.error.kind !== "not_found") return file;
  }

  const signals = detect(files, tree.value.entries.map((e) => e.path));
  if (signals.length === 0) return { ok: false, error: { kind: "no_manifests" } };

  const { owner: o, repo: r, language, stars } = head.value;
  const doc = normalize(signals, { owner: o, repo: r, language, stars });
  if (doc.layers.length === 0) return { ok: false, error: { kind: "nothing_mapped", unmapped: doc.unmapped } };

  return { ok: true, value: { doc, commitOid: head.value.commitOid, partial: tree.value.partial } };
}
