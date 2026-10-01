import { describe, expect, it } from "vitest";
import { layoutTiles, TILE_BUDGET, TILES_PER_ROW } from "@/lib/render/tiles-layout";
import type { Category, StackItem, StackLayer } from "@/lib/stack-map/types";

const items = (n: number): StackItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `i${i}`, display: `Item ${i}`, symbol: `I${i}`, description: "" }));

const layer = (category: Category, count: number, overflow = 0): StackLayer => ({
  category,
  items: items(count),
  overflow,
});

const cells = (out: ReturnType<typeof layoutTiles>) =>
  out.reduce((sum, l) => sum + l.items.length + (l.hidden > 0 ? 1 : 0), 0);

describe("fitting tiles into three rows", () => {
  it("leaves a card that already fits completely alone", () => {
    const out = layoutTiles([layer("frontend", 1), layer("backend", 1), layer("tooling", 6)]);
    expect(out.map((l) => l.items.length)).toEqual([1, 1, 6]);
    expect(out.map((l) => l.hidden)).toEqual([0, 0, 0]);
  });

  it("carries an existing overflow through untouched when there is room", () => {
    const out = layoutTiles([layer("frontend", 1), layer("tooling", 6, 3)]);
    expect(out[1]?.items).toHaveLength(6);
    expect(out[1]?.hidden).toBe(3);
  });

  it.each([
    ["four full layers", [layer("frontend", 6, 2), layer("backend", 6, 1), layer("infra", 6), layer("tooling", 6, 7)]],
    ["next.js's shape", [layer("frontend", 6), layer("backend", 6, 1), layer("infra", 2), layer("tooling", 6, 5)]],
    ["one huge layer", [layer("tooling", 6, 40)]],
    ["two layers", [layer("frontend", 6, 3), layer("tooling", 6, 3)]],
  ])("never exceeds the budget: %s", (_name, layers) => {
    expect(cells(layoutTiles(layers))).toBeLessThanOrEqual(TILE_BUDGET);
  });

  /**
   * The rule the cap exists to protect. A lone backend beside a six-deep tooling layer is
   * the case that made this a floor rather than a pure proportional split: the layer set
   * is the thing the card is for.
   */
  it("keeps at least one item tile for every layer present", () => {
    const layers = [layer("frontend", 6, 9), layer("backend", 1), layer("infra", 6, 9), layer("tooling", 6, 9)];
    const out = layoutTiles(layers);
    for (const l of out) expect(l.items.length, l.category).toBeGreaterThanOrEqual(1);
    expect(out.find((l) => l.category === "backend")?.hidden).toBe(0);
    expect(cells(out)).toBeLessThanOrEqual(TILE_BUDGET);
  });

  it("loses nothing: every dropped item is counted in hidden", () => {
    const layers = [layer("frontend", 6, 2), layer("backend", 6, 1), layer("infra", 6), layer("tooling", 6, 7)];
    const before = layers.reduce((sum, l) => sum + l.items.length + l.overflow, 0);
    const after = layoutTiles(layers).reduce((sum, l) => sum + l.items.length + l.hidden, 0);
    expect(after).toBe(before);
  });

  it("spends the whole budget when there is demand for it", () => {
    const layers = [layer("frontend", 6, 2), layer("backend", 6, 1), layer("infra", 6), layer("tooling", 6, 7)];
    expect(cells(layoutTiles(layers))).toBe(TILE_BUDGET);
  });

  it("gives the biggest layers the spare cells, in layer order on a tie", () => {
    const out = layoutTiles([layer("frontend", 6, 4), layer("backend", 6, 4), layer("infra", 1), layer("tooling", 6, 4)]);
    expect(out.find((l) => l.category === "infra")?.items).toHaveLength(1);
    // Equal demand, so frontend and backend take the remainders before tooling.
    const shown = out.map((l) => l.items.length);
    expect(shown[0]).toBeGreaterThanOrEqual(shown[3] ?? 0);
    expect(shown[1]).toBeGreaterThanOrEqual(shown[3] ?? 0);
  });

  it("fills whole rows, so the budget is three rows exactly", () => {
    expect(TILE_BUDGET).toBe(TILES_PER_ROW * 3);
  });

  it("handles a card with one layer and one item", () => {
    const out = layoutTiles([layer("infra", 1)]);
    expect(out).toEqual([{ category: "infra", items: items(1), hidden: 0 }]);
  });
});
