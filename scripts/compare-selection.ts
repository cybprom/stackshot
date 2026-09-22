// M1 step 5 tool: cards for every fixture under each candidate nested-pool ordering
// (GOTCHAS 024), with and without the candidate drop rule. Uses each fixture's recorded
// tree (no API calls); manifests a recording didn't select are fetched from raw at the
// same pinned commit and cached. Usage: pnpm tsx scripts/compare-selection.ts <cacheDir>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGitHubClient } from "@/lib/github/client";
import { fetchRepoHead, type RepoHead } from "@/lib/github/repo";
import { fetchTree, selectManifests, type NestedOrdering, type TreeEntry } from "@/lib/github/tree";
import { detect } from "@/lib/detect";
import { normalize } from "@/lib/normalize";
import type { StackContent } from "@/lib/stack-map/types";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";
import { recordedManifests } from "@/tests/helpers/manifests";

const FIXTURES = [
  "Grandbusta__spyde",
  "vercel__next.js",
  "fastapi__full-stack-fastapi-template",
  "pocketbase__pocketbase",
  "astral-sh__uv",
  "mastodon__mastodon",
  "laravel__laravel",
  "pmndrs__zustand",
  "github__gitignore",
];

const depth = (p: string) => p.split("/").length;
const byPath = (a: TreeEntry, b: TreeEntry) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const bySizeDesc = (a: TreeEntry, b: TreeEntry) => b.size - a.size || byPath(a, b);
const ecosystem = (p: string) => p.slice(p.lastIndexOf("/") + 1).replace("requirements.txt", "pyproject.toml");

const a: NestedOrdering = (c) => [...c].sort((x, y) => depth(x.path) - depth(y.path) || bySizeDesc(x, y));
const b: NestedOrdering = (c) => [...c].sort(bySizeDesc);
const cOrdering: NestedOrdering = (c) => {
  const firsts = new Map<string, TreeEntry>();
  for (const e of [...c].sort(bySizeDesc)) if (!firsts.has(ecosystem(e.path))) firsts.set(ecosystem(e.path), e);
  const lead = [...firsts.values()].sort(bySizeDesc);
  return [...lead, ...[...c].sort(bySizeDesc).filter((e) => !lead.includes(e))];
};
// "next.js" → next, "uv" → uv: the directory a monorepo names after itself.
function named(repo: string, fallback: NestedOrdering): NestedOrdering {
  const names = new Set([repo.toLowerCase(), repo.toLowerCase().replace(/[.-](js|ts|rs|py|go)$/, "")]);
  return (c) => {
    const parent = (p: string) => p.split("/").slice(-2, -1)[0]?.toLowerCase() ?? "";
    const preferred = [...c].filter((e) => names.has(parent(e.path))).sort(bySizeDesc);
    return [...preferred, ...fallback(c.filter((e) => !preferred.includes(e)))];
  };
}

type Card = { lines: string[]; doc: StackContent };

function card(doc: StackContent): string[] {
  return doc.layers.map((l) => {
    const items = l.items.map((i) => (i.version ? `${i.display} ${i.version}` : i.display)).join(", ");
    return `${l.category.toUpperCase().padEnd(8)} ${items}${l.overflow ? `  +${l.overflow}` : ""}`;
  });
}

async function body(cacheDir: string, head: RepoHead, path: string, recorded: Map<string, string>): Promise<string> {
  const hit = recorded.get(path);
  if (hit !== undefined) return hit;
  const file = join(cacheDir, `${head.owner}__${head.repo}__${head.commitOid.slice(0, 7)}__${path.replaceAll("/", "~")}`);
  if (existsSync(file)) return readFileSync(file, "utf8");
  const url = `https://raw.githubusercontent.com/${head.owner}/${head.repo}/${head.commitOid}/${path}`;
  const res = await fetch(url, { headers: { "User-Agent": "stackshot" } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const text = await res.text();
  writeFileSync(file, text);
  return text;
}

async function main(cacheDir: string) {
  mkdirSync(cacheDir, { recursive: true });
  for (const fixture of FIXTURES) {
    const [owner = "", repo = ""] = fixture.split("__");
    const client = createGitHubClient({ token: "fixture", fetch: fixtureFetch(loadResponses(fixture)) });
    const head = await fetchRepoHead(client, owner, repo);
    if (!head.ok) throw new Error(`${fixture}: ${JSON.stringify(head.error)}`);
    const tree = await fetchTree(client, head.value);
    if (!tree.ok) throw new Error(`${fixture}: ${JSON.stringify(tree.error)}`);
    const recorded = new Map(recordedManifests(fixture).map((f) => [f.path, f.contents]));
    const paths = tree.value.entries.map((e) => e.path);

    const orderings: [string, NestedOrdering][] = [
      ["today (depth, path)", (c) => c],
      ["a", a],
      ["b", b],
      ["c", cOrdering],
      ["d→a", named(repo, a)],
      ["d→b", named(repo, b)],
      ["d→c", named(repo, cOrdering)],
    ];
    // Group orderings that select the same manifests, so identical cards print once.
    const groups = new Map<string, { names: string[]; selection: string[] }>();
    for (const [name, ordering] of orderings) {
      const selection = selectManifests(tree.value.entries, ordering).map((e) => e.path);
      const key = selection.join("\n");
      const group = groups.get(key) ?? { names: [], selection };
      group.names.push(name);
      groups.set(key, group);
    }

    console.log(`\n## ${owner}/${repo}${groups.size === 1 ? "  (all orderings select the same manifests)" : ""}\n`);
    for (const { names, selection } of groups.values()) {
      const files = await Promise.all(selection.map(async (path) => ({ path, contents: await body(cacheDir, head.value, path, recorded) })));
      const signals = detect(files, paths);
      const meta = { owner, repo, language: head.value.language, stars: head.value.stars };
      const plain: Card = { doc: normalize(signals, meta), lines: [] };
      plain.lines = card(plain.doc);
      const withRule = normalize(signals, meta, { dropDevOnlyWhenLayerShips: true });
      const dropped = card(withRule);
      const shown = (doc: StackContent) => new Set(doc.layers.flatMap((l) => l.items.map((i) => i.display)));
      const everything = (dropDevOnlyWhenLayerShips: boolean) =>
        shown(normalize(signals, meta, { dropDevOnlyWhenLayerShips, itemsPerLayer: 999 }));
      const after = everything(true);
      const removed = [...everything(false)].filter((d) => !after.has(d));
      const surfaced = [...shown(withRule)].filter((d) => !shown(plain.doc).has(d));

      console.log(`### ${names.join(" = ")}\n`);
      console.log("```");
      console.log(`nested: ${selection.filter((p) => p.includes("/") && !p.startsWith(".github/")).join(", ") || "(none)"}`);
      console.log("");
      for (const line of plain.lines) console.log(line);
      const changed = dropped.filter((line, i) => line !== plain.lines[i]);
      console.log("");
      if (changed.length === 0 && removed.length === 0) console.log("drop rule: no change");
      else {
        console.log(`drop rule: removes ${removed.join(", ")}${surfaced.length ? `; surfaces ${surfaced.join(", ")}` : ""}`);
        for (const line of changed) console.log(`         → ${line}`);
      }
      console.log("```\n");
    }
  }
}

main(process.argv[2] ?? "compare-cache");
