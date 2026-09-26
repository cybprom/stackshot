import type { ResolveError } from "@/lib/resolve";

/**
 * What a failed resolve is shown as. One reason per thing the reader can act on, not one
 * per row of ARCHITECTURE's failure table — the error kind stays in the logs. ADR-0024.
 */
export const FAILURE_REASONS = [
  "not_found",
  "no_manifests",
  "nothing_mapped",
  "rate_limited",
  "unavailable",
] as const;

export type FailureReason = (typeof FAILURE_REASONS)[number];

// Keyed by kind, so a new ResolveError variant is a type error here rather than a
// silently generic card.
const REASONS: Record<ResolveError["kind"], FailureReason> = {
  not_found: "not_found",
  no_manifests: "no_manifests",
  nothing_mapped: "nothing_mapped",
  rate_limited: "rate_limited",
  // Nothing the reader can do differently about any of these, and nothing they should be
  // asked to distinguish. The counter keeps them apart.
  unauthorized: "unavailable",
  http: "unavailable",
  network: "unavailable",
  timeout: "unavailable",
  bad_response: "unavailable",
};

export function failureReason(error: ResolveError): FailureReason {
  return REASONS[error.kind];
}

/** A throw anywhere under a route is a bug, and bugs are never a repo's fault. */
export const BUG_REASON: FailureReason = "unavailable";

/**
 * Does this failure fix itself without anyone doing anything? It decides how long the
 * failure is allowed to persist, in the pointer and at the CDN alike. ADR-0027.
 *
 * The three deterministic ones are facts about the repo as it stands: asking again in a
 * minute returns the same answer, so caching it for ten minutes costs nothing and saves
 * the budget. The two transient ones are facts about a moment — a rate limit, a slow
 * fetch, a 502 — and caching those is caching our own bad luck.
 */
export function isTransient(reason: FailureReason): boolean {
  return reason === "rate_limited" || reason === "unavailable";
}
