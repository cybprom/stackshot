import type { Cache } from "@/lib/cache";
import { countBug, countFailure, countResolve, countUnmapped } from "@/lib/counters";
import { BUG_REASON, failureReason, isTransient, type FailureReason } from "@/lib/failure";
import type { GitHubClient } from "@/lib/github/client";
import { stackHash } from "@/lib/hash";
import { Card } from "@/lib/render/card";
import { renderErrorCard } from "@/lib/render/error-card";
import { renderToPng } from "@/lib/render/render";
import { isRepoRef } from "@/lib/repo-ref";
import { resolve, type Phase } from "@/lib/resolve";
import type { StackDoc } from "@/lib/stack-map/types";
import type { Theme } from "@/lib/tokens";

/**
 * Cache, resolve and render for one card request. The client is injected exactly as
 * `lib/resolve` takes one, so the whole path is testable against fixtures with no network
 * — the route stays the only code that builds a real one.
 */
export type CardDeps = {
  cache: Cache;
  /**
   * A factory, not a client. `createGitHubClient` starts the 4s resolve deadline the
   * moment it is constructed, so building one up front puts every cache round-trip
   * inside the resolve's own budget — which is enough to time out a repo that resolves
   * comfortably without a cache. Built here, immediately before the resolve that needs
   * it, and never at all on a cache hit. GOTCHAS 042.
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

export async function serveCard(deps: CardDeps, owner: string, repo: string, theme: Theme): Promise<CardResult> {
  try {
    return await run(deps, owner, repo, theme);
  } catch (error) {
    // Any throw is a bug, BudgetExceededError included. Counted apart from the
    // failure-by-reason counts, because a defect inside normal noise is invisible.
    countBug("serve_card", error, { owner, repo, theme });
    return await errorCard(BUG_REASON, owner, repo, theme);
  }
}

async function run(deps: CardDeps, owner: string, repo: string, theme: Theme): Promise<CardResult> {
  const { cache, createClient } = deps;

  if (!isRepoRef(owner, repo)) {
    countFailure("not_found", { owner, repo, gate: "repo-ref" });
    return errorCard("not_found", owner, repo, theme);
  }

  const pointer = await cache.getPointer(owner, repo);
  if (pointer?.kind === "failed") return errorCard(pointer.reason, owner, repo, theme);

  if (pointer?.kind === "ok") {
    const doc = await cache.getDoc(pointer.stackHash);
    // A pointer whose doc has expired is a miss, not a failure: fall through and resolve.
    if (doc) return { bytes: await cardBytes(cache, doc, pointer.stackHash, theme), cacheControl: CACHE_OK };
  }

  if (!createClient) {
    countBug("github_token_missing", new Error("GITHUB_TOKEN missing"), { owner, repo });
    return errorCard("unavailable", owner, repo, theme);
  }

  // Constructed here and nowhere earlier: this call starts the resolve deadline.
  const client = createClient();
  const phases: Phase[] = [];
  const result = await resolve(client, owner, repo, phases);
  countResolve(owner, repo, client.calls(), phases, result.ok ? "ok" : result.error.kind);
  if (!result.ok) {
    const reason = failureReason(result.error);
    countFailure(reason, { owner, repo, error: result.error.kind });
    if (result.error.kind === "nothing_mapped") countUnmapped(result.error.unmapped);
    await cache.setPointer(owner, repo, { kind: "failed", reason });
    return errorCard(reason, owner, repo, theme);
  }

  const { doc, commitOid } = result.value;
  const hash = stackHash(doc);
  countUnmapped(doc.unmapped);
  await cache.setDoc(hash, doc);
  // The pointer is written last, so it never names a doc that isn't there yet. It carries
  // the canonical owner and repo, because the key is the request lowercased. GOTCHAS 040.
  await cache.setPointer(owner, repo, {
    kind: "ok",
    owner: doc.owner,
    repo: doc.repo,
    sha: commitOid,
    stackHash: hash,
  });

  return { bytes: await cardBytes(cache, doc, hash, theme), cacheControl: CACHE_OK };
}

async function cardBytes(cache: Cache, doc: StackDoc, hash: string, theme: Theme): Promise<Buffer> {
  const cached = await cache.getPng(hash, theme);
  if (cached) return cached;
  const bytes = await renderToPng(Card({ doc, theme }));
  await cache.setPng(hash, theme, bytes);
  return bytes;
}

async function errorCard(reason: FailureReason, owner: string, repo: string, theme: Theme): Promise<CardResult> {
  try {
    return { bytes: await renderErrorCard({ reason, owner, repo, theme }), reason, cacheControl: cacheControlFor(reason) };
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
