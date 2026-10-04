// Renders every fixture repo's card and every error card to PNG, both themes, for looking
// at. Four of Milestone 1's five bugs were found this way and none by a test.
// Usage: pnpm tsx scripts/render-cards.ts <outDir> [style]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_STYLES, type CardStyle } from "@/lib/card-style";
import { FAILURE_REASONS } from "@/lib/failure";
import { renderErrorCard } from "@/lib/render/error-card";
import { renderToPng } from "@/lib/render/render";
import { styleDef } from "@/lib/render/styles";
import type { Theme } from "@/lib/tokens";
import { DOC_FIXTURES, fixtureDoc } from "@/tests/helpers/fixture-docs";

async function main(outDir: string, style: CardStyle) {
  mkdirSync(outDir, { recursive: true });
  const { element, height } = styleDef(style);
  const draw = (doc: Parameters<typeof element>[0]["doc"], theme: Theme) =>
    renderToPng(element({ doc, theme }), height);
  console.log(`style: ${style}\n`);

  for (const reason of FAILURE_REASONS) {
    for (const theme of ["light", "dark"] satisfies Theme[]) {
      // The error card wears the requested style's frame now, so it is drawn per style
      // like every other card here rather than once. ADR-0033.
      const png = await renderErrorCard({ reason, owner: "octocat", repo: "hello-world", style, theme });
      writeFileSync(join(outDir, `error-${style}-${reason}-${theme}.png`), png);
      console.log(`error:${reason.padEnd(30)} ${theme.padEnd(5)} ${(png.byteLength / 1024).toFixed(0).padStart(4)}KB`);
    }
  }

  for (const fixture of DOC_FIXTURES) {
    const doc = await fixtureDoc(fixture);
    for (const theme of ["light", "dark"] satisfies Theme[]) {
      const started = performance.now();
      const png = await draw(doc, theme);
      const file = join(outDir, `${style}-${fixture}-${theme}.png`);
      writeFileSync(file, png);
      const layers = doc.layers.map((l) => `${l.category[0]}${l.items.length}${l.overflow ? `+${l.overflow}` : ""}`).join(" ");
      console.log(
        `${fixture.padEnd(36)} ${theme.padEnd(5)} ${(png.byteLength / 1024).toFixed(0).padStart(4)}KB ` +
          `${Math.round(performance.now() - started).toString().padStart(4)}ms  ${layers}`,
      );
    }
  }

  // The two shapes GOTCHAS 039 broke on: 100 characters is what GitHub allows, and a name
  // with no hyphens or dots has no break opportunity at all.
  const base = await fixtureDoc("Grandbusta__spyde");
  const LONG_NAMES = {
    "97-hyphenated": "awesome-machine-learning-operations-and-data-engineering-resources-for-production-systems-2026-ed",
    "100-unbroken": "a".repeat(100),
  };
  for (const [label, repo] of Object.entries(LONG_NAMES)) {
    for (const theme of ["light", "dark"] satisfies Theme[]) {
      const png = await draw({ ...base, repo }, theme);
      writeFileSync(join(outDir, `${style}-name-${label}-${theme}.png`), png);
      console.log(`name:${label.padEnd(31)} ${theme.padEnd(5)} ${(png.byteLength / 1024).toFixed(0).padStart(4)}KB`);
    }
  }
}

const requested = process.argv[3] ?? "sheet";
const style = CARD_STYLES.find((name) => name === requested);
if (!style) throw new Error(`unknown style: ${requested}. One of ${CARD_STYLES.join(", ")}`);
main(process.argv[2] ?? "cards", style);
