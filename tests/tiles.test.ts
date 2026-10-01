import { describe, expect, it } from "vitest";
import satori from "satori";
import { FONTS } from "@/lib/render/fonts";
import { TilesCard } from "@/lib/render/tiles";
import { layoutTiles, TILE_BUDGET, TILE_ROWS, TILES_PER_ROW } from "@/lib/render/tiles-layout";
import type { StackDoc } from "@/lib/stack-map/types";
import { CARD, TILES, type Theme } from "@/lib/tokens";
import { DOC_FIXTURES, fixtureDoc } from "@/tests/helpers/fixture-docs";

/**
 * Tiles is content-height, so `tests/fit.test.ts`'s "nothing past the canvas" is nearly
 * vacuous here — the canvas is the content. What can go wrong instead is the grid: five
 * tiles across missed by four units in the design and cost a whole row, silently, because
 * a wrapping flex container simply reflows. GOTCHAS 048.
 *
 * So this measures the grid from satori's own layout pass rather than trusting the
 * arithmetic, and pins the card's height per shape.
 */
type Box = { top: number; left: number; width: number; height: number };

async function layout(doc: StackDoc, theme: Theme) {
  const tiles: Box[] = [];
  const names: Box[] = [];
  // By text, because a symbol node is the same shape as a name node and the clamp only
  // applies to one of them.
  const displays = new Set(doc.layers.flatMap((l) => l.items.map((i) => i.display)));
  const svg = await satori(TilesCard({ doc, theme }), {
    width: CARD.width,
    fonts: FONTS,
    onNodeDetected: (node) => {
      const box = { top: node.top, left: node.left, width: node.width, height: node.height };
      if (box.width === TILES.tile.width && box.height === TILES.tile.height) tiles.push(box);
      if (displays.has((node.textContent ?? "").trim())) names.push(box);
    },
  });
  return {
    tiles,
    names,
    height: Number(/ height="([\d.]+)"/.exec(svg)?.[1]),
    rows: new Set(tiles.map((t) => t.top)).size,
    columns: new Set(tiles.map((t) => t.left)).size,
    svg,
  };
}

const THEMES = ["light", "dark"] as const;

describe("the tile grid", () => {
  it.each(DOC_FIXTURES.flatMap((f) => THEMES.map((t) => [f, t] as const)))("%s, %s", async (fixture, theme) => {
    const doc = await fixtureDoc(fixture);
    const { tiles, rows, columns } = await layout(doc, theme);

    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.length).toBeLessThanOrEqual(TILE_BUDGET);
    expect(rows).toBeLessThanOrEqual(TILE_ROWS);
    expect(columns).toBeLessThanOrEqual(TILES_PER_ROW);
    // The four-unit miss presents as a fourth column and an extra row, nothing else.
    if (tiles.length >= TILES_PER_ROW) expect(columns).toBe(TILES_PER_ROW);

    const right = Math.max(...tiles.map((t) => t.left + t.width));
    expect(right).toBeLessThanOrEqual(CARD.width - TILES.border - CARD.padding);
  });

  it("packs rows at exactly the gap, with no dead space between them", async () => {
    const { tiles, rows } = await layout(await fixtureDoc("vercel__next.js"), "light");
    const top = Math.min(...tiles.map((t) => t.top));
    const bottom = Math.max(...tiles.map((t) => t.top + t.height));
    expect(rows).toBe(TILE_ROWS);
    expect(bottom - top).toBe(TILE_ROWS * TILES.tile.height + (TILE_ROWS - 1) * TILES.gap);
  });

  it("clamps a tile name to two lines", async () => {
    const doc = await fixtureDoc("vercel__next.js");
    const { names, tiles } = await layout(doc, "light");
    const allocated = layoutTiles(doc.layers);
    // One node per item tile, and the overflow tiles account for the difference — so a
    // clamp that found nothing cannot pass this quietly.
    expect(names).toHaveLength(allocated.reduce((n, l) => n + l.items.length, 0));
    expect(tiles).toHaveLength(names.length + allocated.filter((l) => l.hidden > 0).length);
    for (const name of names) expect(name.height).toBeLessThanOrEqual(TILES.nameMaxHeight);
  });

  it("draws the overflow tile dashed", async () => {
    const { svg } = await layout(await fixtureDoc("vercel__next.js"), "light");
    expect(svg).toContain("stroke-dasharray");
  });
});

/**
 * Measured, for a repo name that fits one line: frame, padding, header, the two 32u
 * section gaps, one tile row and the legend row. A second and third row cost a tile plus
 * a gap and nothing else, which is what keeps the three-row cap's storage arithmetic
 * (ADR-0029) a straight line rather than an estimate.
 */
const ONE_ROW_HEIGHT = 443;

describe("the card is as tall as the rows it has", () => {
  it.each([
    ["vercel__next.js", 3],
    ["pmndrs__zustand", 2],
    ["github__gitignore", 1],
  ] as const)("%s draws %i row(s)", async (fixture, rows) => {
    const { rows: measured, height } = await layout(await fixtureDoc(fixture), "light");
    expect(measured).toBe(rows);
    expect(height).toBe(ONE_ROW_HEIGHT + (rows - 1) * (TILES.tile.height + TILES.gap));
  });

  it("grows by one line when the repo name wraps, and by nothing else", async () => {
    const base = await fixtureDoc("github__gitignore");
    const { height } = await layout({ ...base, repo: "a".repeat(100) }, "light");
    // Two lines at the 36 step is 72 against one line at 64, so the longest name GitHub
    // allows costs 8 units of card. The size ladder pays for most of the wrap.
    expect(height).toBe(ONE_ROW_HEIGHT + 8);
  });
});
