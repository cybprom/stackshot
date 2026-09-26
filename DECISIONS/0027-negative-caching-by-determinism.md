# ADR-0027: Negative caching splits on whether the failure fixes itself

**Status:** Accepted
**Date:** 2026-09-26
**Extends:** ADR-0026, which set the success chain and one error value for all failures

## Context

ARCHITECTURE specified one negative-cache rule: a failed resolve is cached for 10 minutes,
under the same scheme as a success. That was written with a deleted repo in mind — a badge
pointing at a 404 should not re-run detection on every cold CDN request.

It is the wrong rule for half the failures we actually produce, and the live measurements
in GOTCHAS 042 made that concrete rather than theoretical. `pmndrs/zustand` timed out once
against a 4s deadline. Under the single rule, that one unlucky request makes the repo
unavailable for **ten minutes** — a repo that is fine, whose stack resolves correctly, and
which would have succeeded on the next attempt.

Worse, the pointer TTL was not the binding constraint. The error card went out with
`s-maxage=600`, so the Vercel edge holds it for ten minutes **whatever the pointer says**.
Shortening the pointer alone would have changed nothing a reader could see.

## Decision

Classify every `FailureReason` by whether asking again gets a different answer, and let
that decide both TTLs together.

| | Reasons | Pointer | Edge | Downstream |
|---|---|---|---|---|
| **Deterministic** | `not_found`, `no_manifests`, `nothing_mapped` | 10 min | `s-maxage=600` | `max-age=300` |
| **Transient** | `rate_limited`, `unavailable` | **1 min** | **`s-maxage=60`** | **`max-age=60`** |

`lib/failure.ts` owns the split as `isTransient`, so the classification lives beside the
reasons themselves and a new reason cannot be added without choosing a side.

The deterministic three are facts about the repo as it stands. The repo does not exist, or
has no manifests, or has nothing our map knows: ask again in a minute and the answer is the
same, so ten minutes of caching costs a reader nothing and saves the API budget it was
introduced to save.

The transient two are facts about a moment — a rate limit, a slow fetch, a 502, a bug of
ours. Caching those is caching our own bad luck and charging the repo's readers for it.

**One minute rather than nothing at all.** A transient failure is exactly the condition
under which a stampede is most likely and most harmful: something is already slow or
already limited, and a popular README would send every cold CDN request into the same
failing resolve. One minute is long enough to collapse that, short enough that recovery is
not something anyone has to notice.

## Consequences

- A slow repo recovers in about a minute instead of ten. Worst case for a transient
  failure is now ~2 minutes end to end (60s edge + 60s downstream) against ADR-0026's 15.
- More function invocations for repos that fail transiently, by roughly 10×, bounded by
  how long the underlying problem lasts. That is the cost of the trade and it is the right
  side of it: an invocation is cheap, a wrong card in someone's README for ten minutes is
  not.
- `rate_limited` now retries every minute, which is a mild rate-limit amplifier under
  sustained exhaustion. Milestone 4's global budget guard is what bounds that properly; if
  it shows up before then, `rate_limited` moves back to the long TTL on its own, since
  `resetAt` is a known time rather than a guess.
- The two TTLs have to move together. Splitting the pointer without splitting the header
  achieves nothing, which is the mistake this ADR exists to prevent from being made again
  later. `lib/serve-card.ts` derives both from the same predicate for that reason, and the
  route no longer decides.
- `unauthorized` and `bad_response` are classed transient through `unavailable`, though
  neither self-heals. That is deliberate: they are our misconfiguration, not the repo's
  state, so the last thing we want is to cache them for ten minutes across every repo
  someone asks for while we fix the deploy.

## What would make us revisit

- The budget guard lands and `rate_limited` wants a TTL derived from `resetAt` instead of
  a flat minute.
- Deployed measurements show transient failures are rare enough that the retry traffic is
  negligible, in which case dropping the transient pointer entirely is simpler than a
  60-second one.
