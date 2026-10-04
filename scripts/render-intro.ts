// Renders the intro card's PNGs into public/, during the build, from the committed doc.
// Usage: pnpm tsx scripts/render-intro.ts
//
// Not committed as bytes and not fetched from the card route. Bytes in the repo would go
// stale the moment a token moved; the card route hits GitHub on a cold cache, which is the
// one thing the homepage must never do. Rendering needs no network, so this cannot fail on
// GitHub. ADR-0035.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { INTRO_REPO, homeDoc } from "@/lib/home";
import { LAUNCH_STYLES } from "@/lib/preview";
import { renderToPng } from "@/lib/render/render";
import { styleDef } from "@/lib/render/styles";
import { introCardFile } from "@/lib/site";
import type { Theme } from "@/lib/tokens";

const OUT = new URL("../public/", import.meta.url);

async function main() {
  mkdirSync(OUT, { recursive: true });
  const doc = homeDoc(INTRO_REPO);

  // Both launch styles, because the switcher can be flipped before anything is generated
  // and the crossfade needs real bytes to land on either way.
  for (const style of LAUNCH_STYLES) {
    for (const theme of ["light", "dark"] satisfies Theme[]) {
      const { element, height } = styleDef(style);
      const png = await renderToPng(element({ doc, theme }), height);
      const name = introCardFile(style, theme);
      writeFileSync(join(OUT.pathname, name), png);
      console.log(`${name.padEnd(28)} ${(png.byteLength / 1024).toFixed(0).padStart(4)}KB`);
    }
  }
}

main();
