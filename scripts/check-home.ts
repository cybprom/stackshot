// Runs before `next build`, beside scripts/check-env.ts. The committed homepage data was
// written by a past version of this code, so it is an external boundary like any other and
// is validated as one. ADR-0035.
//
// This is safe to make loud precisely because the build has no network: a red build here
// always means a real mismatch, and never means GitHub was down.
import { STALE_AFTER_DAYS, checkHomeData } from "@/lib/home";

const result = checkHomeData();

if (!result.ok) {
  console.error("lib/home-data.json does not match what the code now expects:");
  for (const problem of result.problems) console.error(`  ${problem}`);
  console.error("\nFix: pnpm tsx scripts/prepare-home.ts");
  process.exit(1);
}

const { ageDays, data } = result;
const count = Object.keys(data.docs).length;
console.log(`home data ok (${count} docs, generated ${ageDays}d ago)`);

// Not a failure: a slightly old stack on a demonstration card is not worth refusing a
// deploy over. But the intro card is the first thing every visitor sees, so silence is
// not right either.
if (ageDays > STALE_AFTER_DAYS) {
  console.warn(
    [
      "",
      `  WARNING: the homepage data is ${ageDays} days old (stale past ${STALE_AFTER_DAYS}).`,
      `  The intro card is the first thing every visitor sees, and it is showing a stack`,
      `  as it stood ${ageDays} days ago. Refresh with: pnpm tsx scripts/prepare-home.ts`,
      "",
    ].join("\n"),
  );
}
