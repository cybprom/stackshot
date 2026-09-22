import { z } from "zod";
import type { Result } from "@/lib/result";
import type { GitHubClient, GitHubError } from "@/lib/github/client";
import type { RepoHead } from "@/lib/github/repo";
import type { TreeEntry } from "@/lib/github/tree";

const BlobResponseSchema = z.object({ content: z.string(), encoding: z.literal("base64") });

/** Manifest contents at the pinned commit. Raw first; /git/blobs if raw is throttled. */
export async function fetchManifest(
  client: GitHubClient,
  head: RepoHead,
  entry: TreeEntry,
): Promise<Result<string, GitHubError>> {
  const path = [head.owner, head.repo, head.commitOid, ...entry.path.split("/")]
    .map(encodeURIComponent)
    .join("/");
  const raw = await client.raw(path);
  if (raw.ok || !isThrottling(raw.error) || client.deadlineExpired()) return raw;

  client.raiseBudgetForBlobFallback();
  const blobPath = `/repos/${encodeURIComponent(head.owner)}/${encodeURIComponent(head.repo)}/git/blobs/${entry.sha}`;
  const blob = await client.rest(blobPath, BlobResponseSchema);
  if (!blob.ok) return blob;
  return { ok: true, value: Buffer.from(blob.value.content, "base64").toString("utf8") };
}

// The path came from the tree at this commit, so a 404 is real, not throttling.
function isThrottling(error: GitHubError): boolean {
  return error.kind !== "not_found" && error.kind !== "unauthorized";
}
