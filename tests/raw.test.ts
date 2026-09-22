import { describe, expect, it } from "vitest";
import { createGitHubClient } from "@/lib/github/client";
import { fetchManifest } from "@/lib/github/raw";
import { fetchRepoHead } from "@/lib/github/repo";
import { fetchTree } from "@/lib/github/tree";
import { fixtureFetch, hangingFetch, loadResponses } from "@/tests/helpers/fixture-fetch";

const recorded = fixtureFetch(loadResponses("Grandbusta__spyde"));
const BLOB_BODY = JSON.stringify({ content: Buffer.from('{"name":"x"}').toString("base64"), encoding: "base64" });

// Recorded GraphQL and tree; raw and blob requests answered by `onRaw` and a stub.
function scenario(onRaw: typeof fetch, deadline?: AbortSignal) {
  const blobRequests: string[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) return onRaw(input, init);
    if (url.includes("/git/blobs/")) {
      blobRequests.push(url);
      return new Response(BLOB_BODY, { status: 200 });
    }
    return recorded(input, init);
  };
  const client = createGitHubClient({ token: "t", fetch, deadline, perFetchMs: 20 });
  return { client, blobRequests };
}

async function firstManifest(client: ReturnType<typeof createGitHubClient>) {
  const head = await fetchRepoHead(client, "Grandbusta", "spyde");
  if (!head.ok) throw new Error(JSON.stringify(head.error));
  const tree = await fetchTree(client, head.value);
  if (!tree.ok) throw new Error(JSON.stringify(tree.error));
  const entry = tree.value.entries.find((e) => e.path === "package.json");
  if (!entry) throw new Error("no package.json in fixture");
  return { head: head.value, entry };
}

describe("fetchManifest", () => {
  it("reads raw at the pinned commit without spending budget", async () => {
    const { client, blobRequests } = scenario(recorded);
    const { head, entry } = await firstManifest(client);
    const res = await fetchManifest(client, head, entry);
    expect(res.ok && JSON.parse(res.value).name).toBe("@grandbusta/spyde");
    expect(client.calls()).toBe(2);
    expect(blobRequests).toEqual([]);
  });

  it("falls back to /git/blobs when raw is throttled", async () => {
    const throttled: typeof fetch = async () => new Response("", { status: 429, headers: { "retry-after": "5" } });
    const { client, blobRequests } = scenario(throttled);
    const { head, entry } = await firstManifest(client);
    const res = await fetchManifest(client, head, entry);
    expect(res).toEqual({ ok: true, value: '{"name":"x"}' });
    expect(blobRequests).toHaveLength(1);
    expect(client.calls()).toBe(3);
  });

  it("falls back when raw times out and the deadline has time left", async () => {
    const { client, blobRequests } = scenario(hangingFetch);
    const { head, entry } = await firstManifest(client);
    expect((await fetchManifest(client, head, entry)).ok).toBe(true);
    expect(blobRequests).toHaveLength(1);
  });

  it("does not fall back once the resolve deadline has passed", async () => {
    const deadline = new AbortController();
    const { client, blobRequests } = scenario(hangingFetch, deadline.signal);
    const { head, entry } = await firstManifest(client);
    deadline.abort();
    expect(await fetchManifest(client, head, entry)).toEqual({ ok: false, error: { kind: "timeout" } });
    expect(blobRequests).toEqual([]);
  });

  it("treats a raw 404 as real, not throttling", async () => {
    const missing: typeof fetch = async () => new Response("404: Not Found", { status: 404 });
    const { client, blobRequests } = scenario(missing);
    const { head, entry } = await firstManifest(client);
    expect(await fetchManifest(client, head, entry)).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(blobRequests).toEqual([]);
  });
});
