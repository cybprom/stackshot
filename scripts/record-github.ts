// Usage: node --env-file=.env.local --import tsx scripts/record-github.ts owner/repo
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGitHubClient } from "@/lib/github/client";
import { fetchRepoHead } from "@/lib/github/repo";
import { fetchTree, selectManifests } from "@/lib/github/tree";
import { fetchManifest } from "@/lib/github/raw";
import { fixtureFetch, type Responses } from "@/tests/helpers/fixture-fetch";

const KEPT_HEADERS = ["content-type", "retry-after", "x-ratelimit-remaining", "x-ratelimit-reset"];
// Trees above this are reduced before committing; next.js's is several MB.
const REDUCE_ABOVE_BYTES = 256_000;
const CANDIDATE_NAMES = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
]);

const [owner, repo] = (process.argv[2] ?? "").split("/");
const token = process.env.GITHUB_TOKEN;
if (!owner || !repo || !token) {
  console.error("usage: record-github.ts owner/repo, with GITHUB_TOKEN set");
  process.exit(1);
}

const recorded: Responses = {};

const recordingFetch: typeof fetch = async (input, init) => {
  const started = performance.now();
  const res = await fetch(input, init);
  // Read once and rebuild: clone() failed on next.js's 12.7 MB tree.
  const body = await res.text();
  const ms = Math.round(performance.now() - started);
  console.log(`  ${ms}ms ${(body.length / 1024).toFixed(0)}KB ${String(input).slice(0, 90)}`);
  const headers = Object.fromEntries(KEPT_HEADERS.flatMap((h) => {
    const v = res.headers.get(h);
    return v === null ? [] : [[h, v]];
  }));
  recorded[`${init?.method ?? "GET"} ${String(input)}`] = { status: res.status, headers, body };
  return new Response(body, { status: res.status, headers: res.headers });
};

function refuse(reason: string, detail?: unknown): never {
  console.error(`Refusing to write: ${reason}`, detail ?? "");
  process.exit(1);
}

type RawTree = { truncated: boolean; tree: { path: string; type: string }[] };

// Keeps root entries (lockfiles, monorepo configs), every candidate manifest wherever it
// sits (denied ones included, so the deny list is exercised), and workflows.
function reduceTree(body: string): string {
  const tree: RawTree = JSON.parse(body);
  const kept = tree.tree.filter((e) => {
    const name = e.path.slice(e.path.lastIndexOf("/") + 1);
    return !e.path.includes("/") || CANDIDATE_NAMES.has(name) || e.path.startsWith(".github/workflows/");
  });
  return JSON.stringify({ ...tree, tree: kept });
}

async function selectionFrom(responses: Responses): Promise<string[]> {
  const client = createGitHubClient({ token: "fixture", fetch: fixtureFetch(responses) });
  const head = await fetchRepoHead(client, owner, repo);
  if (!head.ok) return [];
  const tree = await fetchTree(client, head.value);
  return tree.ok ? selectManifests(tree.value.entries).map((e) => e.path) : [];
}

async function main(token: string) {
  // A recording tool, not a request path: the production deadline doesn't apply.
  const client = createGitHubClient({
    token,
    fetch: recordingFetch,
    deadline: AbortSignal.timeout(120_000),
    perFetchMs: 60_000,
  });
  const head = await fetchRepoHead(client, owner, repo);
  console.log("head:", head.ok ? `${head.value.owner}/${head.value.repo}@${head.value.commitOid}` : head.error);

  if (head.ok) {
    const tree = await fetchTree(client, head.value);
    if (tree.ok) {
      const manifests = selectManifests(tree.value.entries);
      console.log("entries:", tree.value.entries.length, "partial:", tree.value.partial);
      for (const entry of manifests) {
        const file = await fetchManifest(client, head.value, entry);
        if (!file.ok) refuse(`manifest ${entry.path} failed`, file.error);
        console.log(" ", entry.path, `${file.value.length} chars`);
      }
    } else {
      refuse("tree call failed", tree.error);
    }
  }

  const treeKey = Object.keys(recorded).find((k) => k.includes("/git/trees/"));
  const treeRes = treeKey ? recorded[treeKey] : undefined;
  if (treeKey && treeRes && treeRes.body.length > REDUCE_ABOVE_BYTES) {
    const full = await selectionFrom(recorded);
    const reducedBody = reduceTree(treeRes.body);
    recorded[treeKey] = { ...treeRes, body: reducedBody };
    const reduced = await selectionFrom(recorded);
    if (full.length === 0 || JSON.stringify(full) !== JSON.stringify(reduced)) {
      refuse("reduced tree selects differently", { full, reduced });
    }
    console.log("selection:", reduced.join(", "));
    console.log(`tree reduced ${treeRes.body.length} -> ${reducedBody.length} bytes, selection unchanged`);
  }

  const dir = join("tests/fixtures/github", `${owner}__${repo}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "responses.json"), JSON.stringify(recorded, null, 2) + "\n");
  console.log(`wrote ${Object.keys(recorded).length} responses to ${dir}, ${client.calls()} API calls`);
}

main(token);
