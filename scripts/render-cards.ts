// Renders every fixture repo's card to PNG, both themes, for looking at.
// Usage: pnpm tsx scripts/render-cards.ts <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Card } from "@/lib/render/card";
import { renderToPng } from "@/lib/render/render";
import type { Theme } from "@/lib/tokens";
import { DOC_FIXTURES, fixtureDoc } from "@/tests/helpers/fixture-docs";

async function main(outDir: string) {
  mkdirSync(outDir, { recursive: true });
  for (const fixture of DOC_FIXTURES) {
    const doc = await fixtureDoc(fixture);
    for (const theme of ["light", "dark"] satisfies Theme[]) {
      const started = performance.now();
      const png = await renderToPng(Card({ doc, theme }));
      const file = join(outDir, `${fixture}-${theme}.png`);
      writeFileSync(file, png);
      const layers = doc.layers.map((l) => `${l.category[0]}${l.items.length}${l.overflow ? `+${l.overflow}` : ""}`).join(" ");
      console.log(
        `${fixture.padEnd(36)} ${theme.padEnd(5)} ${(png.byteLength / 1024).toFixed(0).padStart(4)}KB ` +
          `${Math.round(performance.now() - started).toString().padStart(4)}ms  ${layers}`,
      );
    }
  }
}

main(process.argv[2] ?? "cards");
