# ADR-0014: Call 1 is a GraphQL query, not REST `/repos`

**Status:** Accepted
**Date:** 2026-09-22
**Amends:** ADR-0010 (the PAT decision stands; the shape of call 1 changes)

## Context

ARCHITECTURE.md planned a cold resolve as `GET /repos/{o}/{r}` then
`GET /git/trees/{sha}?recursive=1`, with manifests fetched from raw pinned to "the resolved
SHA". Written that way, it can't be built:

- `/repos` returns the default branch **name**, stars and language, and **no commit SHA**.
- The trees call returns a **tree** SHA. raw.githubusercontent.com resolves commit-ish refs,
  not tree SHAs.

So no pair of REST calls returns metadata, a commit to pin raw to, and the full tree. The
gap was found while planning Milestone 1 step 1, before any code was written. GOTCHAS 023.

## Options considered

**A — Call 1 is one GraphQL query.** It returns `stargazerCount`, `primaryLanguage`,
`defaultBranchRef { name, target { oid, tree { oid, entries } } }`, and call 2 is the REST
recursive tree by tree OID. Still 2 calls, and raw is pinned to a real commit. The root
`entries` also give the truncated-tree fallback at no extra cost. The downside is a second
API style, and error semantics that differ from REST (see Consequences).

**B — REST `/repos` + `trees/{branch}`, with raw fetched by branch name.** It's the
simplest. But manifests can come from two different commits, and raw's per-branch CDN cache
adds staleness we don't control. It gives up the consistency guarantee ADR-0010 relied on.

**C — REST `/commits/HEAD` + trees, dropping stars and language.** 2 calls, correctly
pinned, but it changes `StackDoc` and the card to work around the API.

**D — Three REST calls** (`/repos`, `/commits/{branch}`, trees). Simple, but I6 would move
to 3, and the cold-resolve ceiling would drop to ~1,666/hr.

## Decision

A. It is the only option that keeps both the 2-call budget and the commit-pinned manifest
set, and the root listing removes a third call we would otherwise have needed for
truncated trees (the old `/contents` fallback would have broken I6).

## Consequences

- **GraphQL has its own bucket, and it was measured.** On 2026-09-22 with our PAT, the
  headers read `x-ratelimit-resource: graphql`, limit 5000, and the query costs 1 point.
  The REST tree call reads `core`, limit 5000. A cold resolve therefore costs **1 core +
  1 GraphQL point**, so the ceiling is ~5,000 cold resolves/hour rather than ADR-0010's
  ~2,500, before caching. Under the blob fallback, it's 7 core calls: ~714/hour.
- **`/rate_limit` can't be trusted for this.** During the same measurement, its body
  reported `used: 0` for both buckets while the response headers showed 20+ used. The M4
  budget guard must read the `x-ratelimit-*` headers on real responses, or `rateLimit
  { remaining }` from the query, which call 1 now returns anyway. GOTCHAS 025.
- **GraphQL reports failure in a 200 body.** A missing repo is HTTP 200 with
  `repository: null` and an `errors[].type` of `NOT_FOUND`. Rate limits can arrive as
  `RATE_LIMITED` in the body. The client maps errors from the body, never from `res.ok`.
  There's a recorded fixture for the missing-repo case.
- **An empty repo has `defaultBranchRef: null`.** It maps to `empty_repo`, which the card
  route renders as the no-manifests error card.
- **Timeouts are part of the contract.** Every fetch has a 2.5s timeout inside a 4s
  resolve deadline, so the ~2.4s cold render measured in M0 still fits under 8s. **That
  8s is our working estimate from the M0 plan, not a measured Camo timeout.** A hang
  becomes a `timeout` result and an error card, not a broken image.
- A second API style to maintain. The GraphQL surface is exactly one query, in
  `lib/github/repo.ts`.
- The budget counter counts GraphQL and REST calls equally. I6 is reworded to match.

## What would make us revisit

- GitHub changes GraphQL costing so that this query costs more than 1 point, or the
  GraphQL bucket becomes the binding limit before `core`.
- The query needs nested data beyond the root listing. At that point, fetching manifests
  through GraphQL `Blob.text` may be worth comparing with raw.
- We ever need private repos (the GitHub App question from ADR-0010), because installation
  tokens have different GraphQL limits.
