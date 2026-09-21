import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { CrudeCard } from "@/lib/render/crude-card";
import { renderToPng } from "@/lib/render/render";
import type { Theme } from "@/lib/tokens";

async function main() {
  mkdirSync("docs/spike", { recursive: true });

  for (const theme of ["light", "dark"] as Theme[]) {
    for (const variant of [1, 2] as const) {
      const t0 = Date.now();
      const png = await renderToPng(CrudeCard({ theme, variant }));
      const ms = Date.now() - t0;
      const out = `docs/spike/crude-${theme}-v${variant}.png`;
      writeFileSync(out, png);
      const sha = createHash("sha256").update(png).digest("hex").slice(0, 12);
      console.log(
        `${out.padEnd(34)} ${String(png.length).padStart(7)} bytes ${String(ms).padStart(5)}ms sha ${sha}`,
      );
    }
  }
}

main();
