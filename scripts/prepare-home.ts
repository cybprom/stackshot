// Resolves every repo the homepage shows and writes lib/home-data.json, committed.
// Usage: pnpm tsx scripts/prepare-home.ts [--only owner/repo]
//
// The homepage must never wait on GitHub, so this is the one place its data comes from a
// network call — run by a human, not by a build or a cron. ADR-0035.
//
// Print the layer summaries and read them. A repo whose card reads as noise belongs off
// the wall, and no test can tell you which one that is.
import { writeFileSync } from "node:fs";
import { createGitHubClient } from "@/lib/github/client";
import { HOME_REPOS, INTRO_REPO, type HomeData } from "@/lib/home";
import { resolve } from "@/lib/resolve";
import type { StackDoc } from "@/lib/stack-map/types";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Fall through to whatever GITHUB_TOKEN the shell already has.
}

const OUT = new URL("../lib/home-data.json", import.meta.url);
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN is required. Set it in .env.local or the shell.");
  process.exit(1);
}

/** The one line that tells you whether a card is worth putting on the wall. */
function summary(doc: StackDoc): string {
  const layers = doc.layers
    .map((l) => `${l.category}:${l.items.map((i) => i.display).join(",")}${l.overflow ? ` +${l.overflow}` : ""}`)
    .join("  ");
  return layers || "(nothing mapped)";
}

async function main(token: string, only?: string) {
  const refs = only ? HOME_REPOS.filter((r) => r === only) : HOME_REPOS;
  if (refs.length === 0) {
    console.error(`${only} is not on the homepage list. See WALL_REPOS in lib/home.ts.`);
    process.exit(1);
  }

  const docs: Record<string, StackDoc> = {};
  const failed: string[] = [];
  let stars = 0;

  for (const ref of refs) {
    const [owner = "", repo = ""] = ref.split("/");
    // A dev tool on a laptop, so production's 4s deadline does not apply. GOTCHAS 027.
    const client = createGitHubClient({ token, deadline: AbortSignal.timeout(60_000), perFetchMs: 30_000 });
    const result = await resolve(client, owner, repo);

    if (!result.ok) {
      failed.push(`${ref}: ${result.error.kind}`);
      console.error(`FAILED  ${ref.padEnd(30)} ${result.error.kind}`);
      continue;
    }

    const { doc } = result.value;
    docs[ref] = doc;
    if (ref === INTRO_REPO) stars = doc.stars;

    const cells = doc.layers.reduce((n, l) => n + l.items.length + (l.overflow > 0 ? 1 : 0), 0);
    console.log(`${ref.padEnd(30)} ${String(doc.stars).padStart(7)}★ ${String(cells).padStart(2)} cells  ${summary(doc)}`);
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} failed; nothing written. Fix or drop them, then re-run.`);
    process.exit(1);
  }

  // A partial write would leave the wall holding a mix of two runs, and the age stamp
  // would describe only the newer half.
  if (only) {
    console.error("\n--only is for looking, not for writing. Re-run without it to write the file.");
    return;
  }

  const data: HomeData = { generatedAt: new Date().toISOString(), stars, docs };
  writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`\n${Object.keys(docs).length} docs written · ${INTRO_REPO} at ${stars} stars`);
}

const onlyFlag = process.argv.indexOf("--only");
main(token, onlyFlag === -1 ? undefined : process.argv[onlyFlag + 1]);
