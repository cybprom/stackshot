import { z } from "zod";
import type { Result } from "@/lib/result";
import type { GitHubClient, GitHubError } from "@/lib/github/client";
import type { TreeEntry } from "@/lib/github/tree";

export type RepoHead = {
  owner: string;
  repo: string;
  stars: number;
  language: string | null;
  branch: string;
  commitOid: string;
  treeOid: string;
  // Root blobs, so a truncated recursive tree costs no extra call. ADR-0014.
  rootEntries: TreeEntry[];
  rateLimitRemaining: number;
};

export type RepoHeadError = GitHubError | { kind: "empty_repo" };

// REST /repos has no commit SHA, and raw can't be pinned to a tree SHA. ADR-0014.
export const REPO_HEAD_QUERY = `
query RepoHead($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    owner { login }
    stargazerCount
    primaryLanguage { name }
    defaultBranchRef {
      name
      target {
        ... on Commit {
          oid
          tree { oid entries { name type oid size } }
        }
      }
    }
  }
  rateLimit { remaining }
}`;

const RepoHeadResponseSchema = z.object({
  repository: z
    .object({
      name: z.string(),
      owner: z.object({ login: z.string() }),
      stargazerCount: z.number(),
      primaryLanguage: z.object({ name: z.string() }).nullable(),
      defaultBranchRef: z
        .object({
          name: z.string(),
          target: z.object({
            oid: z.string(),
            tree: z.object({
              oid: z.string(),
              entries: z.array(
                z.object({ name: z.string(), type: z.string(), oid: z.string(), size: z.number() }),
              ),
            }),
          }),
        })
        .nullable(),
    })
    .nullable(),
  rateLimit: z.object({ remaining: z.number() }),
});

/** GitHub API call 1 of 2: metadata, pinned commit, and the root listing. */
export async function fetchRepoHead(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<Result<RepoHead, RepoHeadError>> {
  const res = await client.graphql(REPO_HEAD_QUERY, { owner, name: repo }, RepoHeadResponseSchema);
  if (!res.ok) return res;

  const { repository, rateLimit } = res.value;
  if (!repository) return { ok: false, error: { kind: "not_found" } };
  const branch = repository.defaultBranchRef;
  if (!branch) return { ok: false, error: { kind: "empty_repo" } };

  return {
    ok: true,
    value: {
      owner: repository.owner.login,
      repo: repository.name,
      stars: repository.stargazerCount,
      language: repository.primaryLanguage?.name ?? null,
      branch: branch.name,
      commitOid: branch.target.oid,
      treeOid: branch.target.tree.oid,
      rootEntries: branch.target.tree.entries
        .filter((e) => e.type === "blob")
        .map((e) => ({ path: e.name, sha: e.oid, size: e.size })),
      rateLimitRemaining: rateLimit.remaining,
    },
  };
}
