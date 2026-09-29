import type { StackItem, StackLayer } from "@/lib/stack-map/types";

/** Five fit across 1200 units at `CARD.padding`; four did at the design's 44. GOTCHAS 048. */
export const TILES_PER_ROW = 5;

/**
 * Three rows, so a dense card is 1200×869 rather than 1200×1289. Past that the card is a
 * portrait block taller than the laptop screen it is being read on, which is not a shape
 * a README can absorb.
 */
export const TILE_ROWS = 3;

export const TILE_BUDGET = TILES_PER_ROW * TILE_ROWS;

export type TileLayer = {
  category: StackLayer["category"];
  items: StackItem[];
  /** Rendered as one dashed `+N more` tile, which costs a cell of its own. */
  hidden: number;
};

/**
 * Fits a `StackDoc`'s layers into `TILE_BUDGET` cells.
 *
 * Two rules decide it. **Every layer present keeps at least one item tile**, so a lone
 * backend cannot be crowded out by a six-deep tooling layer — the layer set is the thing
 * the card exists to show. Past that floor, cells go to the layers with the most to say,
 * by largest remainder, ties in layer order.
 *
 * An overflow tile occupies a cell like any other, so a layer that cannot fit takes two:
 * one item and one `+N more`. That is why the floor is 2 for a layer wanting more than
 * one tile, and it is what makes "at least one item tile" structural rather than lucky.
 */
export function layoutTiles(layers: StackLayer[]): TileLayer[] {
  // What each layer would take if nothing were scarce: its items, plus a cell for the
  // overflow tile it already needs.
  const demand = layers.map((layer) => layer.items.length + (layer.overflow > 0 ? 1 : 0));
  const total = demand.reduce((sum, n) => sum + n, 0);

  const slots =
    total <= TILE_BUDGET ? demand : allocate(demand.map((d) => Math.min(d, 2)), demand);

  return layers.map((layer, i) => {
    const cells = slots[i] ?? 0;
    const fits = cells >= (demand[i] ?? 0);
    // A layer that fits shows everything it has; one that doesn't spends a cell saying so.
    const shown = fits ? layer.items.length : Math.max(cells - 1, 0);
    return {
      category: layer.category,
      items: layer.items.slice(0, shown),
      hidden: layer.items.length - shown + layer.overflow,
    };
  });
}

/** Largest remainder over what each layer wants beyond its floor. Ties in layer order. */
function allocate(floors: number[], demand: number[]): number[] {
  const spare = TILE_BUDGET - floors.reduce((sum, n) => sum + n, 0);
  const want = demand.map((d, i) => d - (floors[i] ?? 0));
  const totalWant = want.reduce((sum, n) => sum + n, 0);
  if (spare <= 0 || totalWant <= 0) return floors;

  const exact = want.map((w) => (spare * w) / totalWant);
  const slots = floors.map((floor, i) => floor + Math.floor(exact[i] ?? 0));

  let left = spare - slots.reduce((sum, n, i) => sum + n - (floors[i] ?? 0), 0);
  const order = exact
    .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);

  for (const { i } of order) {
    if (left <= 0) break;
    // Never past what the layer can use, or the cell is wasted on nothing.
    if ((slots[i] ?? 0) >= (demand[i] ?? 0)) continue;
    slots[i] = (slots[i] ?? 0) + 1;
    left -= 1;
  }
  return slots;
}
