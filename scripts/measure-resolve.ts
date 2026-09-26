// Where a resolve's time actually goes, per phase, against the live API.
// Usage: pnpm tsx scripts/measure-resolve.ts [runs] [owner/repo ...]
//
// Runs with a deliberately huge deadline so the true duration is visible rather than
// clipped at 4s. The point is to choose PER_FETCH_MS and RESOLVE_DEADLINE_MS from data.
// GOTCHAS 027, 042.
import { createGitHubClient } from "@/lib/github/client";
import { resolve, type Phase } from "@/lib/resolve";

const NO_LIMIT_MS = 120_000;
const DEFAULT_REPOS = [
  "Grandbusta/spyde",
  "pmndrs/zustand",
  "fastapi/full-stack-fastapi-template",
  "vercel/next.js",
];

function stats(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return { min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
}

async function once(owner: string, repo: string) {
  const phases: Phase[] = [];
  const client = createGitHubClient({
    token: process.env.GITHUB_TOKEN ?? "",
    deadline: AbortSignal.timeout(NO_LIMIT_MS),
    perFetchMs: NO_LIMIT_MS,
  });
  const result = await resolve(client, owner, repo, phases);
  return { phases, ok: result.ok, calls: client.calls() };
}

async function main() {
  const [runsArg, ...rest] = process.argv.slice(2);
  const runs = Number(runsArg) > 0 ? Number(runsArg) : 3;
  const repos = rest.length > 0 ? rest : DEFAULT_REPOS;

  for (const ref of repos) {
    const [owner = "", repo = ""] = ref.split("/");
    const byPhase = new Map<string, number[]>();
    let ok = true;
    let calls = 0;
    for (let i = 0; i < runs; i++) {
      const r = await once(owner, repo);
      ok &&= r.ok;
      calls = r.calls;
      for (const p of r.phases) byPhase.set(p.name, [...(byPhase.get(p.name) ?? []), p.ms]);
    }

    console.log(`\n${ref}  (${runs} runs, calls=${calls}, ${ok ? "ok" : "FAILED"})`);
    const rows = [...byPhase.entries()].sort((a, b) => stats(b[1]).median - stats(a[1]).median);
    for (const [name, xs] of rows) {
      const { min, median, max } = stats(xs);
      const slowest = name === "total" || name === "raw" ? "" : median === stats(rows[0][1]).median ? "" : "";
      console.log(`  ${name.padEnd(46)} min ${String(min).padStart(5)}  med ${String(median).padStart(5)}  max ${String(max).padStart(5)}${slowest}`);
    }
    const slowestFetch = rows.filter(([n]) => n !== "total" && n !== "raw").map(([, xs]) => stats(xs).max);
    console.log(`  -> slowest single fetch ${Math.max(...slowestFetch)}ms, total max ${stats(byPhase.get("total") ?? [0]).max}ms`);
  }
}

main();
