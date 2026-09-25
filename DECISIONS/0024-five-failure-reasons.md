# ADR-0024: Five failure reasons on the card, not one per failure

**Status:** Accepted
**Date:** 2026-09-25

## Context

ADR-0007 settled that every failure on the card route returns 200 with an error card.
It did not settle how many error cards there are.

ARCHITECTURE's failure table has twelve rows. Three never reach a card — a truncated tree
tops up and marks the doc `partial`, a throttled raw fetch falls back to `/git/blobs`, and
`empty_repo` is folded into `no_manifests` by the resolver. That leaves nine failures and
one thrown `BudgetExceededError`, against a reader who is scrolling someone else's README
and did not ask for any of this.

The pull toward one card per row is strong, because the table is right there and it looks
like a specification.

## Options considered

**A — One card per failure.**
Traceable: the table maps to the code with nothing in between, and a reader who sees a
card knows exactly which row produced it. But it writes nine distinct strings for a reader
who can act on about four distinct things. Nobody embedding a badge can do anything
different about a 2.5s timeout, a GitHub 502, a Zod parse failure, an expired token, or
our own budget bug. It also couples copy to error plumbing: a new `GitHubError` kind means
writing new prose, which is a bad reason to hesitate over an error type.

**B — One card, one string, for every failure.**
Cheapest, and wrong in the one place this product is supposed to be good. "Stackshot
couldn't read this repo" tells the owner of a Rust repo nothing, when the true answer —
"Stackshot found no manifest files" — is the whole reason they would look at the card.
The self-debugging property ADR-0007 bought would be thrown away.

**C — Reasons keyed on what the reader can do, with the error kind kept in telemetry.**
Five: `not_found`, `no_manifests`, `nothing_mapped`, `rate_limited`, `unavailable`.

## Decision

C. `lib/failure.ts` maps every `ResolveError` to one of five `FailureReason`s, and
`lib/render/error-card.tsx` holds one copy block per reason. The five are chosen by the
reader's available action, not by our plumbing:

| Reason | What the reader can do |
|---|---|
| `not_found` | Check the name, or make the repo public |
| `no_manifests` | See which manifests Stackshot reads, and whether theirs is one |
| `nothing_mapped` | Nothing, but they learn the map is curated and short, not that their repo is odd |
| `rate_limited` | Wait; it heals on a known clock |
| `unavailable` | Nothing. It is ours, and the card says so |

`unavailable` absorbs `timeout`, `network`, `http`, `bad_response`, `unauthorized`, a
Satori glyph throw, and a thrown `BudgetExceededError`.

The distinctions we are dropping from the image are kept everywhere else: the
failure-by-reason counter (ADR-0012), the separate bug counter for a throw, and the
`x-stackshot-error` header ADR-0007 already prefers over a status code. **Reasons are for
the reader; kinds are for us.**

`lib/failure` sits above the render boundary rather than inside the route, because it has
two callers: the card route now, and `/api/resolve` at Milestone 3, where the site's three
error states come from the same five reasons. A route that maps errors itself would put
that logic in two places and let them drift.

## The error card is shorter than a real card

Added after the first ten renders were reviewed. At 1200 × 800 the error card was mostly
empty below its message — the same complaint GOTCHAS 038 records against a one-layer
success card, on a second surface.

The error card gets a **fixed 1200 × 518** instead, `ERROR_CARD_HEIGHT` derived from the
chrome and band tokens rather than picked. Fixed rather than dynamic, because unlike a
success card its content shape never varies: one header, one rule, one band whose height
is set by the longest rotated gutter label. One constant covers every reason, so none of
GOTCHAS 038's hard parts — a per-doc height entering the render input, the determinism
test, two-pass measurement — are taken on here.

Width stays 1200, so every type size keeps the display ratios DESIGN measured across the
four surfaces. Only the height moves, and `renderToPng` now takes height as a parameter,
which is the same mechanism a variable-height success card would need later.

The cost is that one URL serves two aspect ratios depending on whether the repo resolves,
so the embed snippet must not pin `width` or `height`. That is recorded in DESIGN's card
anatomy and is a constraint on Milestone 3's copy-markdown output.

## Consequences

- Five reasons and nine kinds means the card cannot tell you which kind you hit. Debugging
  a report of "it says unavailable" needs the logs. That is the intended trade and it is
  the reason the counter is not optional.
- `rate_limited` and `unavailable` currently carry the same detail line. They stay separate
  because their gutter labels and reason lines differ and because one is self-healing on a
  known clock; if the copy is still identical when the site's error states land, merging
  them to four is the right call.
- The `Record<ResolveError["kind"], FailureReason>` makes a new error kind a compile error
  rather than a silently generic card. Adding a kind now costs one line and a moment's
  thought about which reason it belongs to.
- Copy is data in a table, so `tests/error-card.test.ts` can assert properties across all
  of it: no apology, no exclamation, no stated time, one line of `card/item`.
- The "no stated time" property is load-bearing beyond tone. A countdown built from
  `resetAt` would make the render non-deterministic, break I2, and make the error PNG
  uncacheable across its own negative-cache window.

## What would make us revisit

- The unmapped log shows a class of repo hitting `nothing_mapped` often enough that the
  card should name what it saw rather than staying generic.
- `unavailable` becomes the most common card in the counters, which would mean it is
  hiding something we need to act on rather than something the reader cannot.
- The site's error states at M3 need a distinction these five cannot express.
