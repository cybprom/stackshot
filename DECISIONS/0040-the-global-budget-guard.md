# ADR-0040: The global budget guard keeps the last 10% for the site

**Status:** Accepted
**Date:** 2026-11-11

## Context

One token serves every request, 5,000 GraphQL points and 5,000 REST calls an hour, and a
cold resolve costs one of each (GOTCHAS 025). The card route is public and cannot be
limited per IP, because Camo fetches from a handful of addresses. A burst of new repos in
READMEs, or someone scripting the route, could spend the whole hour, and then every new
card would be an error card, including on the site. ARCHITECTURE already promised a guard:
below 10%, refuse to resolve repos the card route has never seen.

What it left open: where the reading comes from, where it lives between requests, and
whether the site obeys it too.

## Options considered

**A — Ask GitHub before each resolve.** Exact. But `/rate_limit` reported zero usage while
the headers moved (GOTCHAS 025), and it is a third request on a route limited to two (I6).

**B — Read the headers on the responses we already get, keep the last reading in Redis,
guard the card route only.** No extra request. The reading lags by one resolve, which at
500 remaining is noise. The site keeps resolving below the floor, inside its per-IP limit.

**C — B, and the site obeys the guard too.** Simpler to explain. But then the last 10% is
spent by no one, and the people locked out first are the ones on the site watching a card
load.

## Decision

**B.** Every resolve on either route records what GitHub reported for each bucket, under a
key that expires when that bucket resets. Before a cold resolve, the card route reads it,
and if either bucket is under 10% it serves the `rate_limited` error card with a 60-second
cache. A repo the cache can already answer is never refused, so every card already drawn
keeps serving. The site route is exempt: the floor is a reserve for people, not a stop.

## Consequences

- A cold card request costs one more Redis read, and every resolve two more writes.
- The guard fails open. With no reading, or an unreachable Redis, nothing is refused.
  Failing closed would turn a cache outage into an outage of every new card.
- The reading is whatever the last resolve saw. Concurrent resolves can store an older
  reading over a newer one. The error is a few calls either way.
- A guarded refusal says "Stackshot is over its GitHub rate limit", which is true in
  spirit: we stopped short on purpose. It is counted with `cause: "budget"`, apart from
  GitHub's own `rate_limited`.

## What would make us revisit

- Guard refusals show up in the counters on a normal day. That means real traffic, and the
  answer is a second token or a GitHub App (ADR-0010), not a lower floor.
- The site exhausts the reserve by itself, which would mean the per-IP limit is too loose.
