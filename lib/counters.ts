import type { FailureReason } from "@/lib/failure";

/**
 * Call sites now, storage in Milestone 4 (ADR-0012). Retrofitting call sites is where
 * counters get missed, so they go in with the code they count.
 */

/** An expected failure, by reason. A product signal: some of these are normal. */
export function countFailure(reason: FailureReason, context: Record<string, unknown> = {}): void {
  console.warn(`stackshot.failure ${reason}`, context);
}

/**
 * A throw. Separate from the failure counts on purpose: a defect hidden inside normal
 * failure noise is a defect nobody looks at. ADR-0012 gets its amendment line at M4.
 */
export function countBug(kind: string, error: unknown, context: Record<string, unknown> = {}): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`stackshot.bug ${kind}`, detail, context);
}

/**
 * A cold resolve, with the API calls it cost and where the time went. Logged only when one
 * happens, so its absence is the evidence that a request was served from cache. I6 caps
 * `calls` at 2. The phase breakdown is what makes a timeout actionable: it says which
 * limit to change rather than that one was hit. GOTCHAS 042.
 */
export function countResolve(
  owner: string,
  repo: string,
  calls: number,
  phases: { name: string; ms: number }[] = [],
  outcome = "ok",
): void {
  const breakdown = phases.map((p) => `${p.name}=${p.ms}`).join(" ");
  console.info(`stackshot.resolve ${owner}/${repo} outcome=${outcome} calls=${calls} ${breakdown}`);
}

/**
 * A request served from cache, and what the round trips cost. The deadline does not govern
 * this path, but the distance from the function to Upstash does, and nothing else reports
 * it. Three reads is the whole of a warm request's server work.
 */
export function countCacheHit(owner: string, repo: string, phases: { name: string; ms: number }[]): void {
  console.info(`stackshot.cachehit ${owner}/${repo} ${phases.map((p) => `${p.name}=${p.ms}`).join(" ")}`);
}

/** The product backlog and the abuse signal at once. ARCHITECTURE, rate limiting. */
export function countUnmapped(ids: string[]): void {
  if (ids.length > 0) console.info(`stackshot.unmapped`, ids);
}
