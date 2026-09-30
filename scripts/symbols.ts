// Proposes a Tiles symbol for a technology not yet in the map. Usage:
//   pnpm tsx scripts/symbols.ts                what is allocated, and what is free
//   pnpm tsx scripts/symbols.ts "Bun" "Deno"   candidates for these names
//
// The bootstrap is over: all 225 symbols are reviewed, committed data, and this no longer
// writes. A symbol is baked into every cached PNG containing it, so changing one after a
// card is cached costs a RENDER_VERSION bump and every card carrying it — which is why
// regenerating in bulk is not something this script should still be able to do.
// GOTCHAS 049 has how the allocation was made and why the order mattered.
import { STACK_MAP } from "@/lib/stack-map";

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

const holder = new Map(STACK_MAP.map((e) => [e.symbol, e.display]));
const spareOn = (initial: string) =>
  [..."abcdefghijklmnopqrstuvwxyz"].map((c) => initial + c).filter((c) => !holder.has(c));

const names = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));

if (names.length > 0) {
  for (const name of names) {
    const options = candidates(name);
    const free = options.find((c) => !holder.has(c));
    console.log(`\n${name}`);
    console.log(`  from its own letters: ${options.map((c) => `${c} ${holder.get(c) ?? "FREE"}`).join("  ") || "none"}`);
    console.log(`  first free: ${free ?? "none — every letter in the name is taken"}`);
    if (!free) {
      const spare = spareOn((name[0] ?? "x").toUpperCase());
      console.log(`  spare: ${spare.join(" ") || "this initial is saturated, so it has to be a trade"}`);
    }
  }
} else {
  const byCategory = new Map<string, string[]>();
  for (const entry of STACK_MAP) {
    const rows = byCategory.get(entry.category) ?? [];
    rows.push(`  ${entry.symbol}  ${entry.display}`);
    byCategory.set(entry.category, rows);
  }
  for (const [category, rows] of byCategory) {
    console.log(`\n${category.toUpperCase()}  (${rows.length})`);
    console.log(rows.join("\n"));
  }

  console.log(`\n${STACK_MAP.length} entries, ${new Set(STACK_MAP.map((e) => e.symbol)).size} distinct symbols`);
  console.log("\nfree letters per initial — a saturated one means any change there is a trade:");
  for (const initial of [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]) {
    const free = spareOn(initial);
    const used = 26 - free.length;
    if (used > 0) {
      console.log(`  ${initial}  ${String(used).padStart(2)} used   ${free.length === 0 ? "SATURATED" : free.join(" ")}`);
    }
  }
}
