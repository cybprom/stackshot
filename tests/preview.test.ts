import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PREVIEW_CARDS } from "@/app/preview/cards";
import { CARD_STYLES, DEFAULT_STYLE, type CardStyle } from "@/lib/card-style";
import {
  DEFAULT_LAUNCH_STYLE,
  LAUNCH_STYLES,
  PLATE_HEIGHT_MS,
  PNG_SETTLE_MS,
  PREVIEW_WIDTH,
  REVEAL,
  THEME_MODES,
  family,
  isLaunchStyle,
  legendDelay,
  revealCount,
  revealDuration,
  plateHeight,
  plateScale,
  rowDelay,
  tileDelay,
} from "@/lib/preview";
import { TILES_PER_ROW, TILE_BUDGET, TILE_ROWS } from "@/lib/render/tiles-layout";
import { COPY } from "@/lib/site";
import { CARD, TYPE } from "@/lib/tokens";

describe("the styles the site offers", () => {
  it("offers only styles the renderer has", () => {
    for (const style of LAUNCH_STYLES) {
      expect(CARD_STYLES).toContain(style);
    }
  });

  it("starts the switcher on a style it offers", () => {
    expect(LAUNCH_STYLES).toContain(DEFAULT_STYLE);
  });

  /**
   * The switcher's whole affordability rests on this: a launch style with no HTML draws
   * nothing until its PNG arrives, so every press would request a render. The type system
   * already refuses it; this says so where a reader is looking. ADR-0029, ADR-0032.
   */
  it("has an HTML preview for every style it offers", () => {
    for (const style of LAUNCH_STYLES) {
      expect(PREVIEW_CARDS[style], style).toBeTypeOf("function");
    }
  });

  it("names every offered style and every theme mode", () => {
    for (const style of LAUNCH_STYLES) {
      expect(COPY.style[style], style).toBeTruthy();
    }
    for (const mode of THEME_MODES) {
      expect(COPY.theme[mode], mode).toBeTruthy();
    }
  });

  // The switcher starts where the snippet would start, so the first card a visitor sees
  // is the one they would copy.
  it("starts on the site's default", () => {
    expect(DEFAULT_LAUNCH_STYLE).toBe(DEFAULT_STYLE);
  });

  it.each(["tags", "sheet"] satisfies CardStyle[])("keeps %s out of the switcher", (style) => {
    expect(isLaunchStyle(style)).toBe(false);
  });
});

describe("the preview theme toggle", () => {
  it("offers exactly light, dark and system", () => {
    expect(THEME_MODES).toEqual(["light", "dark", "system"]);
  });
});

describe("the plate's one conversion", () => {
  it("scales the card's own canvas, not a second one", () => {
    expect(PREVIEW_WIDTH).toBe(CARD.width);
    expect(plateScale(CARD.width)).toBe(1);
    expect(plateScale(600)).toBe(0.5);
  });

  // Before the first measurement there is no width, and a zero scale would collapse the
  // card to nothing on the frame the page first paints.
  it.each([0, -10, Number.NaN])("falls back to 1 for a width of %s", (width) => {
    expect(plateScale(width)).toBe(1);
  });

  it("gives the plate the height the scaled card occupies", () => {
    expect(plateHeight(651, 0.5)).toBe(326);
    expect(plateHeight(859, 1)).toBe(859);
  });
});

describe("the reveal", () => {
  it("staggers tiles in grid order and lands the legend after the last one", () => {
    expect(tileDelay(0)).toBeLessThan(tileDelay(1));
    expect(legendDelay(10)).toBeGreaterThan(tileDelay(9));
  });

  it("prints terminal rows in order", () => {
    expect(rowDelay(0)).toBeLessThan(rowDelay(3));
  });

  /**
   * What step 5's crossfade waits for. A fade that starts mid-reveal dissolves a card that
   * is still drawing itself, and decode time is the network's business rather than ours,
   * so the overlap would be arbitrary. ADR-0032.
   */
  it("lasts until the last thing on the card has arrived", () => {
    // Tiles: the legend and the domain land after the final cell.
    expect(revealDuration("tiles", 10)).toBeGreaterThan(tileDelay(9) + REVEAL.tile.duration - 1);
    expect(revealDuration("tiles", 10)).toBeGreaterThanOrEqual(legendDelay(10) + REVEAL.row.duration);
    // Terminal: the domain line lands a step after the last layer row.
    expect(revealDuration("terminal", 4)).toBeGreaterThan(rowDelay(3) + REVEAL.row.duration);
  });

  it("grows with the number of things to reveal", () => {
    expect(revealDuration("tiles", 15)).toBeGreaterThan(revealDuration("tiles", 5));
    expect(revealDuration("terminal", 4)).toBeGreaterThan(revealDuration("terminal", 1));
  });

  // A card with nothing on it still has a frame, so the duration must stay a real number.
  it("survives an empty card", () => {
    expect(revealDuration("tiles", 0)).toBeGreaterThan(0);
    expect(revealDuration("terminal", 0)).toBeGreaterThan(0);
  });

  // Long enough that flipping through the switcher writes nothing, short enough that
  // settling on one does not feel like a stall.
  it("waits before asking for a PNG", () => {
    expect(PNG_SETTLE_MS).toBeGreaterThanOrEqual(400);
    expect(PNG_SETTLE_MS).toBeLessThanOrEqual(1200);
  });
});

/**
 * The plate's height is a gate as well as a motion, so it has two ceilings. Both are
 * silent if broken — the card still arrives, it just arrives wrong — which is why they are
 * asserted rather than noted. ADR-0032.
 */
describe("the eased height between card sizes", () => {
  // The shortest reveal any card can have: Terminal with nothing to print. Past this the
  // height, not the reveal, would be what the crossfade waits for.
  it("finishes inside the shortest reveal", () => {
    const shortest = Math.min(
      revealDuration("terminal", 0),
      revealDuration("tiles", 0),
      ...LAUNCH_STYLES.flatMap((style) => [1, 4, TILE_BUDGET].map((n) => revealDuration(style, n))),
    );
    expect(PLATE_HEIGHT_MS).toBeLessThan(shortest);
  });

  /**
   * The constraint the author named: on a dense Tiles card the frame is still opening
   * while the grid reveals, and a tile must not pop in below the clip. The last row is the
   * one the growth is making space for, so it is the row that governs.
   */
  it("finishes before the last row of tiles begins", () => {
    expect(PLATE_HEIGHT_MS).toBeLessThan(tileDelay(TILES_PER_ROW * (TILE_ROWS - 1)));
  });

  // It travels hundreds of pixels, so it is deliberately slower than the dim's 240.
  it("is slow enough to read as a glide", () => {
    expect(PLATE_HEIGHT_MS).toBeGreaterThan(240);
  });
});

/**
 * The drift guard. Every colour and every size in a preview has to come from the tokens
 * the renderer draws from — a hex pasted out of a design file is how the two
 * implementations diverge while both go on looking correct. ADR-0032.
 */
describe("the previews hold no values of their own", () => {
  const dir = new URL("../app/preview/", import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"));

  it("has previews to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s names no colour of its own", (file) => {
    const source = readFileSync(new URL(file, dir), "utf8");
    expect(source, "a hex belongs in lib/tokens.ts").not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  /**
   * `TYPE.*.family` is the name Satori is given; a browser needs `next/font`'s variable,
   * and `family()` is the only place those two meet.
   */
  it.each(files)("%s asks for a face through family()", (file) => {
    const source = readFileSync(new URL(file, dir), "utf8");
    expect(source).not.toMatch(/"Archivo"|'Archivo'|"Commit Mono"|'Commit Mono'/);
  });
});

describe("the font seam", () => {
  it("maps both card faces to a loaded variable", () => {
    expect(family(TYPE.display.family)).toContain("--font-archivo");
    expect(family(TYPE.item.family)).toContain("--font-commit-mono");
  });
});

describe("what a style reveals one at a time", () => {
  const doc = {
    owner: "pmndrs",
    repo: "zustand",
    language: "TypeScript",
    stars: 59000,
    layers: [
      { category: "frontend" as const, items: [{ id: "react", display: "React", symbol: "Re", description: "" }], overflow: 0 },
      { category: "tooling" as const, items: [{ id: "vitest", display: "Vitest", symbol: "Vt", description: "" }], overflow: 3 },
    ],
  };

  /** Cells for Tiles, from the renderer's own allocator; layer rows for Terminal. */
  it("counts cells for Tiles, including the overflow tile", () => {
    expect(revealCount("tiles", doc)).toBe(3);
  });

  it("counts layer rows for Terminal", () => {
    expect(revealCount("terminal", doc)).toBe(2);
  });

  // I4: at most four layers, whatever a doc claims.
  it("never counts more than four Terminal rows", () => {
    const many = { ...doc, layers: [...doc.layers, ...doc.layers, ...doc.layers] };
    expect(revealCount("terminal", many)).toBe(4);
  });
});
