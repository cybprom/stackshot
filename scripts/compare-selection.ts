// M1 step 5 tool: cards for every fixture under each candidate nested-pool ordering
// (GOTCHAS 024), with and without the candidate drop rule, as text and as JSON for the
// comparison page. Uses each fixture's recorded
// tree (no API calls); manifests a recording didn't select are fetched from raw at the
// same pinned commit and cached. Usage: pnpm tsx scripts/compare-selection.ts <cacheDir>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGitHubClient } from "@/lib/github/client";
import { fetchRepoHead, type RepoHead } from "@/lib/github/repo";
import { fetchTree, selectManifests, type NestedOrdering, type TreeEntry } from "@/lib/github/tree";
import { detect } from "@/lib/detect";
import { normalize } from "@/lib/normalize";
import { isDenied, lookup } from "@/lib/stack-map";
import { parseVersion } from "@/lib/version";
import type { RawSignal } from "@/lib/stack-map/types";
import { MAX_ITEMS_PER_LAYER } from "@/lib/normalize";
import { matchesAlias } from "@/lib/stack-map";
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

type Provenance = { id: string; source: string; scope: string; raw?: string; bound?: string; counted: boolean };
type Item = { display: string; version?: string; hidden: boolean; from: Provenance[] };
type Layer = { category: string; items: Item[]; overflow: number };
type Variant = { key: string; selection: string[]; layers: Layer[] };
type Report = { owner: string; repo: string; language: string | null; stars: number; variants: Variant[] };

function card(layers: Layer[]): string[] {
  return layers.map((l) => {
    const items = l.items.filter((i) => !i.hidden).map((i) => (i.version ? `${i.display} ${i.version}` : i.display)).join(", ");
    return `${l.category.toUpperCase().padEnd(8)} ${items}${l.overflow ? `  +${l.overflow}` : ""}`;
  });
}

// Which signals survived deny, mapping and the runtimeOnly rule, per entry id.
function provenance(signals: RawSignal[]): Map<string, RawSignal[]> {
  const byEntry = new Map<string, RawSignal[]>();
  for (const signal of signals) {
    if (isDenied(signal.id)) continue;
    const entry = lookup(signal.id);
    if (!entry || (entry.runtimeOnly && signal.scope === "dev")) continue;
    byEntry.set(entry.id, [...(byEntry.get(entry.id) ?? []), signal]);
  }
  return byEntry;
}

function layersOf(signals: RawSignal[], meta: Omit<Report, "variants">, drop: boolean): Layer[] {
  const full = normalize(signals, meta, { dropDevOnlyWhenLayerShips: drop, itemsPerLayer: 999 });
  const sources = provenance(signals);
  return full.layers.map((layer) => ({
    category: layer.category,
    overflow: Math.max(0, layer.items.length - MAX_ITEMS_PER_LAYER),
    items: layer.items.map((item, index) => {
      const from = (sources.get(item.id) ?? []).map((s) => ({
        id: s.id,
        source: s.source,
        scope: s.scope,
        ...(s.rawVersion ? { raw: s.rawVersion, bound: parseVersion(s.rawVersion)?.bound ?? "none" } : {}),
        counted: countsForVersion(item.id, s),
      }));
      return { display: item.display, hidden: index >= MAX_ITEMS_PER_LAYER, from, ...(item.version ? { version: item.version } : {}) };
    }),
  }));
}

// Mirrors normalize's versionFrom filter, so the page can mark the version's source.
function countsForVersion(id: string, signal: RawSignal): boolean {
  const entry = lookup(signal.id);
  if (!entry || entry.id !== id || !signal.rawVersion) return false;
  return entry.versionFrom ? entry.versionFrom.some((p) => matchesAlias(signal.id, p)) : true;
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

async function main(cacheDir: string, jsonPath?: string) {
  mkdirSync(cacheDir, { recursive: true });
  const report: Report[] = [];

  for (const fixture of FIXTURES) {
    const [owner = "", repo = ""] = fixture.split("__");
    const client = createGitHubClient({ token: "fixture", fetch: fixtureFetch(loadResponses(fixture)) });
    const head = await fetchRepoHead(client, owner, repo);
    if (!head.ok) throw new Error(`${fixture}: ${JSON.stringify(head.error)}`);
    const tree = await fetchTree(client, head.value);
    if (!tree.ok) throw new Error(`${fixture}: ${JSON.stringify(tree.error)}`);
    const recorded = new Map(recordedManifests(fixture).map((f) => [f.path, f.contents]));
    const paths = tree.value.entries.map((e) => e.path);
    const meta = { owner, repo, language: head.value.language, stars: head.value.stars };

    const orderings: [string, NestedOrdering, boolean][] = [
      ["today", (c) => c, false],
      ["a", a, false],
      ["a+drop", a, true],
      ["b", b, false],
      ["c", cOrdering, false],
      ["d→a", named(repo, a), false],
      ["d→b", named(repo, b), false],
      ["d→c", named(repo, cOrdering), false],
    ];

    const variants: Variant[] = [];
    for (const [key, ordering, drop] of orderings) {
      const selection = selectManifests(tree.value.entries, ordering).map((e) => e.path);
      const files = await Promise.all(
        selection.map(async (path) => ({ path, contents: await body(cacheDir, head.value, path, recorded) })),
      );
      const signals = detect(files, paths);
      variants.push({ key, selection, layers: layersOf(signals, meta, drop) });
    }
    report.push({ ...meta, variants });

    console.log(`\n## ${owner}/${repo}\n`);
    for (const variant of variants) {
      const same = variants.find((v) => v !== variant && v.key !== variant.key && JSON.stringify(v.layers) === JSON.stringify(variant.layers));
      console.log(`### ${variant.key}${same ? ` (same card as ${same.key})` : ""}`);
      console.log("```");
      for (const line of card(variant.layers)) console.log(line);
      console.log("```");
    }
  }

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\nwrote ${jsonPath}`);
  }
}

main(process.argv[2] ?? "compare-cache", process.argv[3]);
