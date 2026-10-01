// Regenerates tests/fixtures/render-hashes.json.
// Usage: pnpm tsx scripts/render-hashes.ts
//
// Only for a DELIBERATE change to rendered output, and then in the same commit as a
// RENDER_VERSION bump — see the failure message in tests/render-hash.test.ts. The test's
// "covers every committed hash" case is what keeps this matrix and that one in step.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { FAILURE_REASONS } from "@/lib/failure";
import { renderErrorCard } from "@/lib/render/error-card";
import { renderToPng } from "@/lib/render/render";
import { styleDef } from "@/lib/render/styles";
import { RENDER_VERSION, type Theme } from "@/lib/tokens";
import { fixtureDoc } from "@/tests/helpers/fixture-docs";

const OUT = new URL("../tests/fixtures/render-hashes.json", import.meta.url);
const DOCS = ["Grandbusta__spyde", "vercel__next.js", "mastodon__mastodon", "github__gitignore"];
const THEMES = ["light", "dark"] satisfies Theme[];
const STYLES = ["sheet", "tiles"] as const;

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

async function main() {
  const hashes: Record<string, string> = {};

  for (const style of STYLES) {
    const { element, height } = styleDef(style);
    for (const fixture of DOCS) {
      const doc = await fixtureDoc(fixture);
      for (const theme of THEMES) {
        hashes[`${style}:${fixture}:${theme}`] = sha(await renderToPng(element({ doc, theme }), height));
      }
    }
  }

  for (const reason of FAILURE_REASONS) {
    hashes[`error:${reason}:light`] = sha(await renderErrorCard({ reason, owner: "octocat", repo: "hello-world", theme: "light" }));
  }
  hashes["error:not_found:dark"] = sha(
    await renderErrorCard({ reason: "not_found", owner: "octocat", repo: "hello-world", theme: "dark" }),
  );

  writeFileSync(OUT, `${JSON.stringify(hashes, null, 2)}\n`);
  console.log(`${Object.keys(hashes).length} hashes written at RENDER_VERSION ${RENDER_VERSION}`);
}

main();
