// Usage: node --env-file=.env.local --import tsx scripts/record-github.ts owner/repo
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGitHubClient } from "@/lib/github/client";
import { fetchRepoHead } from "@/lib/github/repo";
import { fetchTree, selectManifests } from "@/lib/github/tree";
import { fetchManifest } from "@/lib/github/raw";
import type { RecordedResponse } from "@/tests/helpers/fixture-fetch";

const KEPT_HEADERS = ["content-type", "retry-after", "x-ratelimit-remaining", "x-ratelimit-reset"];

const [owner, repo] = (process.argv[2] ?? "").split("/");
const token = process.env.GITHUB_TOKEN;
if (!owner || !repo || !token) {
  console.error("usage: record-github.ts owner/repo, with GITHUB_TOKEN set");
  process.exit(1);
}

const recorded: Record<string, RecordedResponse> = {};

const recordingFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  const body = await res.clone().text();
  const headers = Object.fromEntries(KEPT_HEADERS.flatMap((h) => {
    const v = res.headers.get(h);
    return v === null ? [] : [[h, v]];
  }));
  recorded[`${init?.method ?? "GET"} ${String(input)}`] = { status: res.status, headers, body };
  return res;
};

async function main(token: string) {
  const client = createGitHubClient({ token, fetch: recordingFetch });
  const head = await fetchRepoHead(client, owner, repo);
  console.log("head:", head.ok ? `${head.value.owner}/${head.value.repo}@${head.value.commitOid}` : head.error);

  if (head.ok) {
    const tree = await fetchTree(client, head.value);
    if (tree.ok) {
      const manifests = selectManifests(tree.value.entries);
      console.log("entries:", tree.value.entries.length, "partial:", tree.value.partial);
      for (const entry of manifests) {
        const file = await fetchManifest(client, head.value, entry);
        console.log(" ", entry.path, file.ok ? `${file.value.length} chars` : file.error);
      }
    } else {
      console.log("tree:", tree.error);
    }
  }

  const dir = join("tests/fixtures/github", `${owner}__${repo}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "responses.json"), JSON.stringify(recorded, null, 2) + "\n");
  console.log(`wrote ${Object.keys(recorded).length} responses to ${dir}, ${client.calls()} API calls`);
}

main(token);
