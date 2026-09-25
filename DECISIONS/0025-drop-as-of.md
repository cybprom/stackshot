# ADR-0025: Drop `asOf` from the card

**Status:** Accepted
**Date:** 2026-09-25

## Context

The card's footer carried `stack as of 2026-03-14`. `asOf` was set once, the first time a
given `stackHash` was written to KV, and travelled with the document thereafter. It existed
because the obvious thing — a generation timestamp — is a clock reading, and a clock
reading in a pure render breaks I2.

ARCHITECTURE justified the field like this:

> The consequence is honest and actually more useful than a generation timestamp: the card
> reads *"stack as of 2026-03-14"*, meaning **the date this project's stack last changed**.
> A repo that hasn't touched its dependencies in eight months says so.

That claim is false, in two independent ways, and both were in the design from the start.

**It is false on first resolve.** `asOf` is the date *Stackshot first saw* this stack, not
the date the repo changed it. A repo that last touched its dependencies in January and is
resolved for the first time today shows today's date. The eight-month-old stack does not
say so; it says it is new. Every card is wrong on the day it is first generated, which is
the day most people look at it.

**It is false again 30 days later.** `stack:{stackHash}` has a 30-day TTL. A repo nobody
requests for a month loses its entry, and the next request re-assigns `asOf` to that day.
So the field silently resets to "now" on a schedule unrelated to the repo — and the
quieter the project, the more often it happens. The number is least trustworthy for exactly
the repos the feature was sold on.

## Options considered

**A — Keep it and fix the claim.** Relabel it "first seen by Stackshot". Honest, and
worthless: nobody reading someone else's README cares when our cache first saw a repo. It
would be a true fact nobody needs, occupying the footer of the product.

**B — Derive a real "last changed" date.** Take the committer date of the most recent
commit touching a manifest path. It is a genuine answer to the question the footer was
pretending to answer, and it costs an API call per manifest path, against a budget of two
calls total (I6). It also stops being a pure function of the `StackDoc`, so it has to enter
the hash, and then every date change invalidates every render.

**C — Remove the date.** The footer keeps `stackshot.ilerioluwa.com` and nothing on the
right, matching the error card.

## Decision

C. A field that is wrong on day one and resets on a cache TTL is worse than no field: it
invites a reader to trust a number that means nothing. B is the only version worth having
and it costs more than the whole detection budget.

## Consequences

- **The pipeline becomes entirely stateless.** `asOf` was the only value the cache
  *assigned* rather than stored, and it took the machinery with it: the read-before-write
  on first resolve, the `SET NX` to make two concurrent cold requests agree on a date, and
  the question of what a TTL expiry means for a value that is supposed to be permanent.
  `lib/cache.ts` is now a plain content-keyed store with nothing to reconcile.
- `StackContent` existed only as `Omit<StackDoc, "asOf">`. It is gone, and `normalize`
  returns a `StackDoc` directly.
- I2 gets easier rather than harder: there is no longer any value in the render input
  whose provenance is a clock.
- The footer's right side is empty on both cards. That is a design consequence, not an
  oversight — see DESIGN's card anatomy.
- We lose the ability to answer "is this card stale?" from the card itself. Staleness is
  now purely a cache-chain property, bounded by the numbers in ADR-0026.
- The writeup loses a beat. `WRITEUP-OUTLINE.md` told this as "a constraint producing a
  better feature than the thing it blocked". The honest version is better material: the
  constraint produced a feature that looked clever, survived design review, shipped into
  ARCHITECTURE as a justification, and was wrong the whole time for a reason anyone could
  have found by asking what the number says on day one.

## What would make us revisit

- The budget rises enough that B is affordable — a commit-history call per resolve — and
  a real "manifests last changed" date becomes cheap. Then it is a new field with a true
  meaning, not this one restored.
