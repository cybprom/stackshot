import { writeFileSync, mkdirSync } from "node:fs";
import { Card } from "@/lib/render/card";
import { renderToPng } from "@/lib/render/render";
import { SPIKE_DOC } from "@/lib/spike-doc";
import { WORST_CASE_DOC } from "@/lib/spike-doc-worst";
import type { Theme } from "@/lib/tokens";

async function main() {
  mkdirSync("docs/spike", { recursive: true });
  const docs = [
    ["anatomy", SPIKE_DOC],
    ["worst", WORST_CASE_DOC],
  ] as const;
  for (const [name, doc] of docs) {
    for (const theme of ["light", "dark"] as Theme[]) {
      const png = await renderToPng(Card({ doc, theme }));
      const out = `docs/spike/card-${name}-${theme}.png`;
      writeFileSync(out, png);
      console.log(`${out.padEnd(36)} ${String(png.length).padStart(7)} bytes`);
    }
  }
}
main();
