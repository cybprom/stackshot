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
