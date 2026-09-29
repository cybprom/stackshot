// Proposes a two-letter Tiles symbol for every map entry. Usage:
//   pnpm tsx scripts/symbols.ts            print the proposal and any collisions
//   pnpm tsx scripts/symbols.ts --write    insert `symbol:` into lib/stack-map/entries/*.ts
//
// A bootstrap tool, not a runtime one. Symbols are committed data because each is baked
// into every cached PNG containing it: derived at runtime, a symbol would depend on map
// order, so adding one entry could silently change another's and invalidate cards nobody
// touched. Run this once, read the contact sheet, fix what reads wrong, and freeze it.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STACK_MAP } from "@/lib/stack-map";

const FILES = ["frontend", "backend", "infra", "tooling"];
const dir = join(process.cwd(), "lib", "stack-map", "entries");

/**
 * The periodic table's own rule: the first two letters, or the first plus a later one
 * where that is taken. Multi-word names take both initials first, because `Ga` says
 * GitHub Actions and `Gi` says nothing.
 */
function candidates(display: string): string[] {
  const words = display.split(/[^A-Za-z0-9]+/).filter(Boolean);
  // ".js" is a suffix, not a second word: Next.js is one name.
  const parts = words.length > 1 && /^(js|ts)$/i.test(words[words.length - 1] ?? "") ? words.slice(0, -1) : words;
  const head = parts[0] ?? display;
  const first = head[0] ?? "x";
  const out: string[] = [];

  const push = (second: string | undefined) => {
    if (!second) return;
    const symbol = first.toUpperCase() + second.toLowerCase();
    if (/^[A-Z][a-z0-9]$/.test(symbol) && !out.includes(symbol)) out.push(symbol);
  };

  if (parts.length > 1) push(parts[1]?.[0]);
  for (const ch of head.slice(1)) push(ch);
  for (const word of parts.slice(1)) for (const ch of word) push(ch);
  for (const ch of display) push(ch);
  return out;
}

/**
 * Crowded initials run out: nine names begin with P and there are only so many letters in
 * "Poetry". These keep the first letter, which is the half that carries recognition, and
 * take any second — always enough, and always flagged, because `Pq` means nothing and the
 * review pass exists to catch exactly that.
 */
function fallbacks(display: string): string[] {
  const first = (display[0] ?? "x").toUpperCase();
  return [..."abcdefghijklmnopqrstuvwxyz0123456789"].map((ch) => first + ch);
}

/**
 * Taken first, before anything is derived. Two groups, neither of them taste.
 *
 * **The designer's own picks**, read off `docs/design/directions/tiles.dc.html`, which
 * hand-lettered 26 tiles. Where a real decision already exists it outranks a heuristic:
 * the ladder had given Tailwind `Ti` and webpack `We` while `Tw` and `Wp` sat free,
 * because it takes the first available letter in name order rather than the idiomatic one.
 *
 * **Languages and runtimes**, because `weight` ranks within a layer and types.ts
 * deliberately depresses them — "the header already names the primary language" — which
 * is a card-ranking concern with nothing to do with symbols. Sorting by weight without
 * this hands Python `Pk` and Rust `Rg`.
 *
 * Next.js is the one design pick left out: it asked for `Nx`, which is the literal name
 * of another entry. That is a real conflict and belongs in the review pass, not here.
 */
const ANCHORS: Record<string, string> = {
  // Languages and runtimes.
  node: "No",
  python: "Py",
  go: "Go",
  rust: "Rs",
  ruby: "Rb",
  php: "Ph",
  java: "Ja",
  deno: "De",
  // From the design file.
  react: "Re",
  typescript: "Ts",
  tailwindcss: "Tw",
  sass: "Sa",
  eslint: "El",
  esbuild: "Eb",
  rollup: "Ru",
  vitest: "Vt",
  jest: "Je",
  playwright: "Pl",
  webpack: "Wp",
  turborepo: "Tb",
  lerna: "Le",
  vercel: "Vc",
  "github-actions": "Ga",
  swr: "Sw",
  lucide: "Lu",
  "radix-ui": "Rx",
  tokio: "Tk",
  serde: "Sd",
  clap: "Cl",
  "napi-rs": "Na",
  "pnpm-workspaces": "Pn",
};

function propose(): { symbols: Map<string, string>; guessed: Set<string>; stuck: string[] } {
  const taken = new Set<string>();
  const symbols = new Map<string, string>();
  const guessed = new Set<string>();
  const stuck: string[] = [];

  // By weight, not by file order. Letters are scarce, and in declaration order frontend
  // and backend took the good ones while tooling was left with Tc for TypeScript.
  //
  // `weight` ranks within a layer, not across the map, so this is a proxy and a knowingly
  // imperfect one: a 90-weight frontend framework outranks GitHub Actions, which far more
  // readers will actually see. Allocation really wants frequency across repos, which we
  // will not have until the counters run. The review pass is what corrects it — which is
  // why the contention report below exists.
  const order = [...STACK_MAP].sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : 1));

  for (const [id, symbol] of Object.entries(ANCHORS)) {
    taken.add(symbol);
    symbols.set(id, symbol);
  }

  for (const entry of order) {
    if (symbols.has(entry.id)) continue;
    const derived = candidates(entry.display).find((c) => !taken.has(c));
    const pick = derived ?? fallbacks(entry.display).find((c) => !taken.has(c));
    if (!pick) {
      stuck.push(`${entry.id} (${entry.display})`);
      continue;
    }
    if (!derived) guessed.add(entry.id);
    taken.add(pick);
    symbols.set(entry.id, pick);
  }
  return { symbols, guessed, stuck };
}

/** Replaces or inserts `symbol:` after each entry's `display:` line, keyed by the `id:` above it. */
function write(symbols: Map<string, string>): number {
  let count = 0;
  for (const name of FILES) {
    const path = join(dir, `${name}.ts`);
    const lines = readFileSync(path, "utf8").split("\n");
    const out: string[] = [];
    let id = "";
    for (const line of lines) {
      // Rerunnable: an existing symbol line is dropped and rewritten, never doubled.
      if (/^\s*symbol:\s*"/.test(line)) continue;
      out.push(line);
      const idMatch = /^\s*id:\s*"([^"]+)"/.exec(line);
      if (idMatch?.[1]) id = idMatch[1];
      if (/^(\s*)display:\s*"/.test(line) && symbols.has(id)) {
        const indent = /^(\s*)/.exec(line)?.[1] ?? "    ";
        out.push(`${indent}symbol: "${symbols.get(id)}",`);
        count += 1;
      }
    }
    writeFileSync(path, out.join("\n"));
  }
  return count;
}

const { symbols, guessed, stuck } = propose();

if (process.argv.includes("--write")) {
  console.log(`wrote ${write(symbols)} symbols into lib/stack-map/entries/`);
} else {
  const byCategory = new Map<string, string[]>();
  for (const entry of STACK_MAP) {
    const rows = byCategory.get(entry.category) ?? [];
    const flag = guessed.has(entry.id) ? " <- no letters left, pick one" : "";
    rows.push(`  ${(symbols.get(entry.id) ?? "??").padEnd(4)} ${entry.display}${flag}`);
    byCategory.set(entry.category, rows);
  }
  for (const [category, rows] of byCategory) {
    console.log(`\n${category.toUpperCase()}  (${rows.length})`);
    console.log(rows.join("\n"));
  }
  console.log(`\n${symbols.size} symbols, ${new Set(symbols.values()).size} distinct, ${guessed.size} need a human`);

  // For the flagged ones, who holds the letters they wanted. The reviewer's real choice is
  // usually a trade, not an invention.
  if (guessed.size > 0) {
    const holder = new Map([...symbols].map(([id, sym]) => [sym, id]));
    console.log("\nCONTENTION — these took a meaningless letter; who holds what they wanted:");
    for (const entry of STACK_MAP) {
      if (!guessed.has(entry.id)) continue;
      const wanted = candidates(entry.display)
        .slice(0, 4)
        .map((c) => `${c} (${holder.get(c) ?? "free"})`)
        .join("  ");
      console.log(`  ${entry.display.padEnd(12)} got ${symbols.get(entry.id)}   wanted: ${wanted}`);
    }
  }
  if (stuck.length > 0) console.log(`NO CANDIDATE LEFT for:\n  ${stuck.join("\n  ")}`);
}
