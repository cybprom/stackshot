import { describe, expect, it } from "vitest";
import { createGitHubClient } from "@/lib/github/client";
import { fetchRepoHead } from "@/lib/github/repo";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";

const head = (fixture: string, repo = "spyde") =>
  fetchRepoHead(
    createGitHubClient({ token: "t", fetch: fixtureFetch(loadResponses(fixture)) }),
    "Grandbusta",
    repo,
  );

describe("fetchRepoHead", () => {
  it("returns metadata, the pinned commit and the root blobs", async () => {
    const res = await head("Grandbusta__spyde");
    if (!res.ok) throw new Error(JSON.stringify(res.error));
    expect(res.value).toMatchObject({
      owner: "Grandbusta",
      repo: "spyde",
      stars: 10,
      language: "TypeScript",
      commitOid: "8ea92b3bf187ef50513847cc88f29c8b80338d91",
      treeOid: "747af83ea1f69164cc2fed6d7ead078934689d8b",
    });
    const rootPaths = res.value.rootEntries.map((e) => e.path);
    expect(rootPaths).toContain("package.json");
    expect(rootPaths).not.toContain("docs");
  });

  it("reads not-found from a 200 body, not the status", async () => {
    const res = await head("Grandbusta__stackshot-fixture-missing-repo", "stackshot-fixture-missing-repo");
    expect(res).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it("maps a repo with no default branch to empty_repo", async () => {
    expect(await head("derived__empty-repo")).toEqual({ ok: false, error: { kind: "empty_repo" } });
  });

  it("maps a GraphQL RATE_LIMITED error to rate_limited", async () => {
    const body = JSON.stringify({ data: null, errors: [{ type: "RATE_LIMITED", message: "limit" }] });
    const fetch: typeof globalThis.fetch = async () =>
      new Response(body, { status: 200, headers: { "x-ratelimit-reset": "1790000000" } });
    const res = await fetchRepoHead(createGitHubClient({ token: "t", fetch }), "a", "b");
    expect(res).toEqual({ ok: false, error: { kind: "rate_limited", resetAt: 1_790_000_000_000 } });
  });
});
