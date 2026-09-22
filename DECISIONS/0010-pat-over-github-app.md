# ADR-0010: A classic PAT for v1, and manifests fetched from raw.githubusercontent.com

**Status:** Accepted
**Amended by:** ADR-0014 (call 1 is GraphQL; `/repos` has no commit SHA)
**Date:** 2026-09-21

## Context

Unauthenticated GitHub REST is 60 requests/hour per IP. That is exhausted within minutes of
launch. Authentication is required from day one, and the choice of mechanism sets the
rate-limit ceiling.

## Options considered

**A — Unauthenticated.** 60/hr. Not viable. Listed only to rule it out explicitly.

**B — A classic personal access token, scoped to public repos only.**
5,000 REST requests/hour. One environment variable. No OAuth flow, no installation, no
webhook handling. The quota is shared across all users of the service and tied to a
personal account.

**C — A GitHub App.**
15,000/hour on the app's own installations, a cleaner identity, and a path to private-repo
support later. Requires an app registration, installation flow, JWT signing, and
installation-token caching — a day of work for a project budgeted at three weekends.

**D — Ask each user for their own token.**
Perfect quota isolation. Destroys the product: nobody pastes a token to generate a README
badge.

## Decision

B for v1, plus a rate-limit optimisation that matters more than the token choice:

**Manifest file contents are fetched from `raw.githubusercontent.com`, pinned to the
resolved commit SHA, not through the REST blobs API.** Raw fetches do not consume the REST
rate limit. This drops the per-resolve cost from up to 8 REST calls to exactly 2 — the repo
metadata call and the recursive tree call — which raises the effective ceiling from ~625
cold resolves/hour to ~2,500, before caching.

That optimisation makes the PAT's 5,000/hr comfortable enough that the GitHub App's extra
capacity is not worth a day of build time.

## Consequences

- One shared quota for all users. A traffic spike is a global outage, not a per-user one.
  Mitigated by aggressive caching, negative caching, and the global budget guard described
  in ARCHITECTURE.md.
- The token is tied to a personal account. If it is revoked or expires, the service stops.
  Set a long expiry, set a calendar reminder, and alert on 403s.
- `raw.githubusercontent.com` is not a documented API with a published rate limit. It is
  widely used this way and is stable in practice, but it could throttle without notice.
  **The fallback is the `/git/blobs` API**, which costs REST budget and temporarily raises
  the I6 ceiling to 8. This fallback must be implemented in Milestone 1, not deferred.
- Pinning raw fetches to the resolved SHA rather than a branch name means the manifest set
  is internally consistent — no risk of reading files from two different commits.
- Private repos remain impossible, which is already out of scope.

## What would make us revisit

- Sustained traffic pushes the REST budget past ~60% in any hour.
- Raw fetches start getting throttled in production.
- Private repo support is ever wanted, which makes the GitHub App mandatory rather than
  optional.
