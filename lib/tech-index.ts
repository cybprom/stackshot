import { STACK_MAP } from "@/lib/stack-map";
import type { Category } from "@/lib/stack-map/types";

/**
 * The searchable index of the whole map, render-free so it can be tested without a DOM.
 *
 * **The rows are server-rendered and the island reads its index back off them**, rather
 * than the map being shipped a second time as JSON. The one thing the DOM cannot supply
 * is what a tile does not show — its aliases — so each tile carries a `data-search`
 * blob, and that is the only duplication. ADR-0036.
 */

/** How many tiles are shown before "Show all N". Two rows at desktop width. */
export const INDEX_CAP = 24;

/** The layer chips, with All first and selected by default. */
export const INDEX_ALL = "all" as const;

export type IndexFilter = typeof INDEX_ALL | Category;

/**
 * The stagger as the grid arrives, from `docs/design/site/a-playground.dc.html`: 18ms a
 * tile, **capped at 360ms**. The cap is what makes it work at this count — uncapped, the
 * 24th tile would wait 432ms and a search returning 100 would take two seconds to finish
 * appearing. The card preview's own stagger is slower and steeper, because it paces five
 * tiles a row across a card rather than a wall of a hundred.
 */
export function indexTileDelay(i: number): number {
  return Math.min(i * 18, 360);
}

export type IndexEntry = {
  id: string;
  symbol: string;
  display: string;
  category: Category;
  /** Lowercased display, id and de-namespaced aliases. What a search is matched against. */
  search: string;
};

/**
 * Aliases are namespaced (`npm:next`, `docker:postgres`) and the namespace is noise to
 * someone typing a name, so it is dropped. A trailing `*` is a prefix pattern, not part
 * of any name anyone would type.
 */
function searchable(entry: (typeof STACK_MAP)[number]): string {
  const alias = entry.aliases.map((a) => a.replace(/^[a-z]+:/, "").replace(/\*$/, ""));
  const names = [entry.display, entry.id, ...alias].map((n) => n.toLowerCase());
  // Also without punctuation, because people type `nextjs` and `nodejs` for things
  // called `Next.js` and `Node`. A test caught this; nothing else would have.
  const bare = names.map((n) => n.replace(/[^a-z0-9]/g, "")).filter((n) => n !== "");
  return [...new Set([...names, ...bare])].join(" ");
}

export const TECH_INDEX: readonly IndexEntry[] = [...STACK_MAP]
  // Alphabetical by what is read, not by id: the grid is scanned, and `id` is an internal
  // key that sorts `nextjs` away from `Next.js`.
  .sort((a, b) => a.display.localeCompare(b.display, "en"))
  .map((entry) => ({
    id: entry.id,
    symbol: entry.symbol,
    display: entry.display,
    category: entry.category,
    search: searchable(entry),
  }));

export const TECH_COUNT = TECH_INDEX.length;

export function countByCategory(): Record<Category, number> {
  const counts: Record<Category, number> = { frontend: 0, backend: 0, infra: 0, tooling: 0 };
  for (const entry of TECH_INDEX) counts[entry.category] += 1;
  return counts;
}

/**
 * How well a query matches, or `null` for no match. Higher is better.
 *
 * Substring today, and the scores are spread so there is somewhere to put a fuzzy match
 * later without changing anything that reads this. The grid is ordered by the number this
 * returns, so **ranking is already wired**: a better matcher is a change here and nowhere
 * else. ADR-0036.
 */
export function score(entry: Pick<IndexEntry, "display" | "search">, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (q === "") return 0;

  const display = entry.display.toLowerCase();
  if (display === q) return 100;
  if (display.startsWith(q)) return 80;
  if (display.includes(q)) return 60;
  // An alias or the id matched, so the name on the tile will not contain what was typed.
  if (entry.search.includes(q)) return 40;
  return null;
}
