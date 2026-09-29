// Renders every map entry as a Tiles tile, for reading the symbols as a stranger would.
// Usage: pnpm tsx scripts/symbol-sheet.ts <outDir>
//
// Drawn by Satori with the real fonts and tokens, because the question is whether a symbol
// reads on a card — not whether it looks sensible in a table.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { FONTS } from "@/lib/render/fonts";
import { STACK_MAP } from "@/lib/stack-map";
import type { MapEntry } from "@/lib/stack-map/types";
import { LAYER_COLORS, type Theme } from "@/lib/tokens";

const PER_ROW = 10;
const TILE = { w: 208, h: 192, gap: 18, radius: 12, rule: 6 };
const PAD = 32;
const WIDTH = PAD * 2 + PER_ROW * TILE.w + (PER_ROW - 1) * TILE.gap;

function tile(entry: MapEntry, theme: Theme) {
  const { color, tint } = LAYER_COLORS[theme][entry.category];
  const ink = theme === "light" ? "#101615" : "#DDE2DD";
  const muted = theme === "light" ? "#5A625E" : "#8B9490";
  return {
    type: "div",
    props: {
      style: {
        width: TILE.w, height: TILE.h, display: "flex", flexDirection: "column",
        justifyContent: "space-between", boxSizing: "border-box", borderRadius: TILE.radius,
        background: tint, borderTop: `${TILE.rule}px solid ${color}`, padding: "12px 18px 16px",
      },
      children: [
        { type: "div", props: { style: { display: "flex", justifyContent: "flex-end", height: 22, fontFamily: "Commit Mono", fontSize: 18, lineHeight: 1, color: muted }, children: entry.category.slice(0, 2) } },
        { type: "div", props: { style: { display: "flex", fontFamily: "Archivo", fontWeight: 700, fontSize: 64, lineHeight: 1, letterSpacing: -1.9, color }, children: entry.symbol } },
        { type: "div", props: { style: { display: "flex", fontFamily: "Archivo", fontWeight: 400, fontSize: 23, lineHeight: "26px", maxHeight: 52, overflow: "hidden", color: ink }, children: entry.display } },
      ],
    },
  };
}

async function main() {
  const outDir = process.argv[2] ?? "sheet";
  mkdirSync(outDir, { recursive: true });

  for (const theme of ["light", "dark"] satisfies Theme[]) {
    const surface = theme === "light" ? "#FFFFFF" : "#12171C";
    const tree = {
      type: "div",
      props: {
        style: { width: WIDTH, display: "flex", flexWrap: "wrap", gap: TILE.gap, padding: PAD, background: surface },
        children: STACK_MAP.map((entry) => tile(entry, theme)),
      },
    };
    // Zoom 1: a review sheet, not a card. At 2x this would be 9,000px tall.
    const svg = await satori(tree as never, { width: WIDTH, fonts: FONTS });
    const png = new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
    const file = join(outDir, `symbols-${theme}.png`);
    writeFileSync(file, png);
    console.log(`${file}  ${STACK_MAP.length} tiles  ${(png.byteLength / 1024).toFixed(0)}KB`);
  }

  // Names that wrap to two lines are the ones to check for a clamp.
  const long = STACK_MAP.filter((e) => e.display.length > 11).map((e) => `${e.symbol} ${e.display}`);
  console.log(`\n${long.length} names over 11 characters, the two-line candidates:\n  ${long.join("\n  ")}`);
}

main();
