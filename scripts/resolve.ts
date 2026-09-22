// Usage: pnpm tsx scripts/resolve.ts owner/repo — prints the StackDoc content as JSON.
import { createGitHubClient } from "@/lib/github/client";
import { resolve } from "@/lib/resolve";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Fall through to whatever GITHUB_TOKEN the shell already has.
}

const [owner, repo] = (process.argv[2] ?? "").split("/");
const token = process.env.GITHUB_TOKEN;
if (!owner || !repo || !token) {
  console.error("usage: resolve.ts owner/repo, with GITHUB_TOKEN set");
  process.exit(1);
}

async function main(owner: string, repo: string, token: string) {
  // A dev tool: local latency isn't Vercel's, so the 4s production deadline doesn't apply. GOTCHAS 027.
  const client = createGitHubClient({ token, deadline: AbortSignal.timeout(60_000), perFetchMs: 30_000 });
  const started = performance.now();
  const result = await resolve(client, owner, repo);
  const ms = Math.round(performance.now() - started);

  if (!result.ok) {
    console.error(`resolve failed after ${ms}ms, ${client.calls()} API calls:`, result.error);
    process.exit(1);
  }
  const { doc, partial, commitOid } = result.value;
  console.log(JSON.stringify(doc, null, 2));
  console.error(`${ms}ms · ${client.calls()} API calls · ${commitOid.slice(0, 7)} · partial=${partial} · ${doc.unmapped.length} unmapped`);
}

main(owner, repo, token);
