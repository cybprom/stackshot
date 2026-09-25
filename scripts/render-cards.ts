// Renders every fixture repo's card and every error card to PNG, both themes, for looking
// at. Four of Milestone 1's five bugs were found this way and none by a test.
// Usage: pnpm tsx scripts/render-cards.ts <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FAILURE_REASONS } from "@/lib/failure";
import { Card } from "@/lib/render/card";
import { renderErrorCard } from "@/lib/render/error-card";
import { renderToPng } from "@/lib/render/render";
import type { Theme } from "@/lib/tokens";
import { DOC_FIXTURES, fixtureDoc } from "@/tests/helpers/fixture-docs";

async function main(outDir: string) {
  mkdirSync(outDir, { recursive: true });

  for (const reason of FAILURE_REASONS) {
    for (const theme of ["light", "dark"] satisfies Theme[]) {
      const png = await renderErrorCard({ reason, owner: "octocat", repo: "hello-world", theme });
      writeFileSync(join(outDir, `error-${reason}-${theme}.png`), png);
      console.log(`error:${reason.padEnd(30)} ${theme.padEnd(5)} ${(png.byteLength / 1024).toFixed(0).padStart(4)}KB`);
    }
  }

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

  // The two shapes GOTCHAS 039 broke on: 100 characters is what GitHub allows, and a name
  // with no hyphens or dots has no break opportunity at all.
  const base = await fixtureDoc("Grandbusta__spyde");
  const LONG_NAMES = {
    "97-hyphenated": "awesome-machine-learning-operations-and-data-engineering-resources-for-production-systems-2026-ed",
    "100-unbroken": "a".repeat(100),
  };
  for (const [label, repo] of Object.entries(LONG_NAMES)) {
    for (const theme of ["light", "dark"] satisfies Theme[]) {
      const png = await renderToPng(Card({ doc: { ...base, repo }, theme }));
      writeFileSync(join(outDir, `name-${label}-${theme}.png`), png);
      console.log(`name:${label.padEnd(31)} ${theme.padEnd(5)} ${(png.byteLength / 1024).toFixed(0).padStart(4)}KB`);
    }
  }
}

main(process.argv[2] ?? "cards");
