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

/**
 * The one wording of each failure, shared by the card and the site so they cannot drift.
 * Sentence case, active voice, no apology, and nothing that reads as the repo's fault.
 *
 * `label` is the card's rotated gutter label and names the state the way a layer label
 * names a layer — the only all-caps in the project. The site never renders it.
 * Neither string carries the repo: the card puts it in the header, the site beside the
 * message. DESIGN.md UI COPY RULES, SIGNATURE.
 */
export const ERROR_COPY: Record<FailureReason, { label: string; reason: string; detail: string }> = {
  not_found: {
    label: "NOT FOUND",
    reason: "Stackshot couldn't find this repo.",
    detail: "It may be private, renamed, or deleted.",
  },
  no_manifests: {
    label: "NO MANIFESTS",
    reason: "Stackshot found no manifest files here.",
    // Names every root manifest lib/github/tree.ts selects. tests/error-card.test.ts
    // fails if that list and this sentence drift apart.
    detail:
      "It reads package.json, pyproject.toml, requirements.txt, go.mod, Cargo.toml, Gemfile and composer.json on the default branch.",
  },
  nothing_mapped: {
    label: "NOTHING MAPPED",
    reason: "Stackshot didn't recognize anything this repo uses.",
    // The unmapped log is the backlog, so this is a fact rather than a hedge.
    detail: "Its list of technologies is curated and still growing.",
  },
  rate_limited: {
    label: "RATE LIMITED",
    reason: "Stackshot is over its GitHub rate limit.",
    // Never a countdown: resetAt is a clock reading, and the render has to stay pure (I2).
    detail: "Try again shortly. Nothing is wrong with this repo.",
  },
  unavailable: {
    label: "UNAVAILABLE",
    reason: "Stackshot couldn't read this repo right now.",
    detail: "Try again shortly. Nothing is wrong with this repo.",
  },
};

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
