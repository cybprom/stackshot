import satori from "satori";
import { Card } from "@/lib/render/card";
import { FONTS } from "@/lib/render/fonts";
import { SPIKE_DOC } from "@/lib/spike-doc";
import { WORST_CASE_DOC } from "@/lib/spike-doc-worst";
import { CARD, type Theme } from "@/lib/tokens";
import type { StackDoc } from "@/lib/stack-map/types";

// Satori does not clip or warn on vertical overflow — it draws outside the canvas.
// Yoga's default flexShrink is 0, so a too-tall card silently loses its footer.
function maxY(svg: string): number {
  let max = 0;
  for (const m of svg.matchAll(/<rect[^>]*\sy="(-?[\d.]+)"[^>]*\sheight="(-?[\d.]+)"/g)) {
    max = Math.max(max, parseFloat(m[1]) + parseFloat(m[2]));
  }
  for (const m of svg.matchAll(/\sd="([^"]+)"/g)) {
    for (const n of m[1].matchAll(/[-\d.]+\s+([-\d.]+)/g)) {
      const v = parseFloat(n[1]);
      if (Number.isFinite(v)) max = Math.max(max, v);
    }
  }
  return max;
}

async function main() {
  const cases: [string, StackDoc][] = [
    ["anatomy", SPIKE_DOC],
    ["worst", WORST_CASE_DOC],
  ];
  let failed = false;
  for (const [name, doc] of cases) {
    for (const theme of ["light", "dark"] as Theme[]) {
      const svg = await satori(Card({ doc, theme }), {
        width: CARD.width,
        height: CARD.height,
        fonts: FONTS,
      });
      const y = maxY(svg);
      const fits = y <= CARD.height;
      if (!fits) failed = true;
      console.log(
        `${name}-${theme}`.padEnd(16),
        `maxY=${y.toFixed(1).padStart(7)}`,
        `canvas=${CARD.height}`,
        fits ? `fits, ${(CARD.height - y).toFixed(1)} spare` : "*** OVERFLOWS ***",
      );
    }
  }
  process.exit(failed ? 1 : 0);
}
main();
