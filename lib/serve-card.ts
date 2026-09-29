import type { Cache } from "@/lib/cache";
import { countBug, countCacheHit } from "@/lib/counters";
import { BUG_REASON, isTransient, type FailureReason } from "@/lib/failure";
import type { GitHubClient } from "@/lib/github/client";
import type { CardStyle } from "@/lib/card-style";
import { styleDef } from "@/lib/render/styles";
import { renderErrorCard } from "@/lib/render/error-card";
import { renderToPng } from "@/lib/render/render";
import { resolveCached } from "@/lib/resolve-cached";
import type { StackDoc } from "@/lib/stack-map/types";
import type { Theme } from "@/lib/tokens";

/**
 * One card request: resolve through the cache, then render it or explain it. Everything
 * before the render is shared with the site's JSON route — see `lib/resolve-cached`.
 */
export type CardDeps = {
  cache: Cache;
  /**
   * A factory, not a client. `createGitHubClient` starts the resolve deadline the moment
   * it is constructed, so building one up front puts every cache round-trip inside the
   * resolve's own budget. Built immediately before the resolve that needs it, and never
   * at all on a cache hit. GOTCHAS 042.
   *
   * Absent means no GITHUB_TOKEN: a misconfiguration that shipped, not a repo problem.
   */
  createClient: (() => GitHubClient) | undefined;
};

export type CardResult = { bytes: Buffer; reason?: FailureReason; cacheControl: string };

// ADR-0026 for the success chain, ADR-0027 for the two error cases. The edge is keyed by
// URL and holds whatever it is given, so a transient failure needs a short s-maxage as
// much as it needs a short pointer TTL: otherwise the CDN serves the error card for ten
// minutes whatever the pointer does.
export const CACHE_OK = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
export const CACHE_ERROR_DETERMINISTIC = "public, max-age=300, s-maxage=600";
export const CACHE_ERROR_TRANSIENT = "public, max-age=60, s-maxage=60";

export function cacheControlFor(reason: FailureReason | undefined): string {
  if (!reason) return CACHE_OK;
  return isTransient(reason) ? CACHE_ERROR_TRANSIENT : CACHE_ERROR_DETERMINISTIC;
}

export async function serveCard(
  deps: CardDeps,
  owner: string,
  repo: string,
  style: CardStyle,
  theme: Theme,
): Promise<CardResult> {
  try {
    return await run(deps, owner, repo, style, theme);
  } catch (error) {
    // Any throw is a bug, BudgetExceededError included. Counted apart from the
    // failure-by-reason counts, because a defect inside normal noise is invisible.
    countBug("serve_card", error, { owner, repo, style, theme });
    return await errorCard(BUG_REASON, owner, repo, theme);
  }
}

async function run(
  deps: CardDeps,
  owner: string,
  repo: string,
  style: CardStyle,
  theme: Theme,
): Promise<CardResult> {
  const result = await resolveCached(deps, owner, repo);
  if (!result.ok) return errorCard(result.reason, owner, repo, theme);

  const { doc, stackHash, cached, reads } = result;
  const started = performance.now();
  const png = await deps.cache.getPng(style, stackHash, theme);
  reads.push({ name: "png", ms: Math.round(performance.now() - started) });
  if (cached) countCacheHit(owner, repo, reads);
  if (png) return { bytes: png, cacheControl: CACHE_OK };

  return { bytes: await render(deps.cache, doc, style, stackHash, theme), cacheControl: CACHE_OK };
}

async function render(
  cache: Cache,
  doc: StackDoc,
  style: CardStyle,
  stackHash: string,
  theme: Theme,
): Promise<Buffer> {
  const { element, height } = styleDef(style);
  const bytes = await renderToPng(element({ doc, theme }), height);
  await cache.setPng(style, stackHash, theme, bytes);
  return bytes;
}

async function errorCard(reason: FailureReason, owner: string, repo: string, theme: Theme): Promise<CardResult> {
  try {
    return {
      bytes: await renderErrorCard({ reason, owner, repo, theme }),
      reason,
      cacheControl: cacheControlFor(reason),
    };
  } catch (error) {
    // The card that explains the failure has itself failed. Render one with nothing
    // interpolated — this is the floor under I5, not a path we expect to reach.
    countBug("error_card_render", error, { reason, owner, repo });
    return {
      bytes: await renderErrorCard({ reason: "unavailable", owner: "", repo: "", theme }),
      reason,
      cacheControl: cacheControlFor(reason),
    };
  }
}
