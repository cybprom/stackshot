import type { Cache } from "@/lib/cache";
import { countFailure, countResolve, countUnmapped } from "@/lib/counters";
import { failureReason, type FailureReason } from "@/lib/failure";
import type { GitHubClient } from "@/lib/github/client";
import { stackHash } from "@/lib/hash";
import { isRepoRef } from "@/lib/repo-ref";
import { resolve, type Phase } from "@/lib/resolve";
import type { StackDoc } from "@/lib/stack-map/types";

/**
 * Cache-first resolve, shared by the card route and the site's JSON route. Rendering is
 * deliberately not here: the two routes differ in what they do with a `StackDoc`, not in
 * how they get one, and keeping this common is what makes the case-insensitive keying and
 * the negative-cache split true of both by construction rather than by copy.
 */
export type ResolveDeps = {
  cache: Cache;
  // Absent means no GITHUB_TOKEN. See CardDeps for why this is a factory: constructing a
  // client starts the resolve deadline. GOTCHAS 042.
  createClient: (() => GitHubClient) | undefined;
  /**
   * Called immediately before a resolve that will cost GitHub budget, and not at all on a
   * cache hit. Refusing yields `rate_limited`. The card route passes nothing.
   */
  gate?: () => Promise<boolean>;
};

export type CachedResolve =
  | { ok: true; doc: StackDoc; stackHash: string; cached: boolean; reads: Phase[] }
  | { ok: false; reason: FailureReason; reads: Phase[] };

export async function resolveCached(deps: ResolveDeps, owner: string, repo: string): Promise<CachedResolve> {
  const { cache, createClient, gate } = deps;
  const reads: Phase[] = [];
  const read = async <T>(name: string, run: () => Promise<T>): Promise<T> => {
    const started = performance.now();
    try {
      return await run();
    } finally {
      reads.push({ name, ms: Math.round(performance.now() - started) });
    }
  };

  if (!isRepoRef(owner, repo)) {
    countFailure("not_found", { owner, repo, gate: "repo-ref" });
    return { ok: false, reason: "not_found", reads };
  }

  const pointer = await read("pointer", () => cache.getPointer(owner, repo));
  if (pointer?.kind === "failed") return { ok: false, reason: pointer.reason, reads };

  if (pointer?.kind === "ok") {
    const doc = await read("doc", () => cache.getDoc(pointer.stackHash));
    // A pointer whose doc has expired is a miss, not a failure: fall through and resolve.
    if (doc) return { ok: true, doc, stackHash: pointer.stackHash, cached: true, reads };
  }

  if (!createClient) {
    countFailure("unavailable", { owner, repo, cause: "no_token" });
    return { ok: false, reason: "unavailable", reads };
  }

  // The only place budget is spent, so the only place the limiter applies.
  if (gate && !(await gate())) {
    countFailure("rate_limited", { owner, repo, cause: "per_ip" });
    return { ok: false, reason: "rate_limited", reads };
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
    return { ok: false, reason, reads };
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

  return { ok: true, doc, stackHash: hash, cached: false, reads };
}
