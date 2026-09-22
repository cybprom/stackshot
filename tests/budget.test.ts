import { expect, it } from "vitest";
import { API_BUDGET, createGitHubClient } from "@/lib/github/client";
import { fetchManifest } from "@/lib/github/raw";
import { fetchRepoHead } from "@/lib/github/repo";
import { fetchTree, selectManifests } from "@/lib/github/tree";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";

// I6. Extended to the full resolver in Milestone 1 step 4.
it("a cold fetch of every selected manifest makes at most 2 GitHub API calls", async () => {
  const client = createGitHubClient({ token: "t", fetch: fixtureFetch(loadResponses("Grandbusta__spyde")) });

  const head = await fetchRepoHead(client, "Grandbusta", "spyde");
  if (!head.ok) throw new Error(JSON.stringify(head.error));
  const tree = await fetchTree(client, head.value);
  if (!tree.ok) throw new Error(JSON.stringify(tree.error));
  const manifests = selectManifests(tree.value.entries);
  const files = await Promise.all(manifests.map((e) => fetchManifest(client, head.value, e)));

  expect(manifests.map((e) => e.path)).toEqual([
    "package.json",
    ".github/workflows/docs.yml",
    "docs/package.json",
  ]);
  expect(files.every((f) => f.ok)).toBe(true);
  expect(client.calls()).toBeLessThanOrEqual(API_BUDGET);
});
