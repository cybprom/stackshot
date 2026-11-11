// Weekly, from .github/workflows/embed-count.yml: counts README files GitHub's code search
// finds mentioning the card's domain, and stores it for /api/stats. ADR-0012's north star.
//
// It undercounts: search indexing is incomplete and private repos are invisible. Read the
// trend, not the number.
//
//   SEARCH_TOKEN=… UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=… pnpm tsx scripts/embed-count.ts
import { Redis } from "@upstash/redis";
import { isoWeek, statsKeys } from "@/lib/counters";
import { upstashConfig } from "@/lib/env";
import { SITE_ORIGIN } from "@/lib/site";
import { embedCountFrom, embedQuery } from "@/lib/stats";

async function main() {
  // The workflow's own token can only search its repository, so this is a separate PAT.
  const token = process.env.SEARCH_TOKEN;
  const config = upstashConfig();
  if (!token || !config) {
    console.error("Needs SEARCH_TOKEN, UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    process.exit(1);
  }
  // Production's numbers by default: the workflow is not a deployment, so it has no VERCEL_ENV.
  const env = process.env.STATS_ENV ?? "production";

  const query = embedQuery(new URL(SITE_ORIGIN).host);
  const response = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "stackshot",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const count = response.ok ? embedCountFrom(await response.json()) : undefined;
  if (count === undefined) {
    console.error(`Code search failed: HTTP ${response.status}`);
    process.exit(1);
  }

  const week = isoWeek(new Date());
  await new Redis(config).hset(statsKeys(env).embeds, { [week]: count });
  console.log(`${env} ${week}: ${count} READMEs mention ${new URL(SITE_ORIGIN).host}`);
}

void main();
