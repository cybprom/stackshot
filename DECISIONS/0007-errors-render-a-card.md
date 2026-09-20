# ADR-0007: Every failure on the card route returns 200 with an error card

**Status:** Accepted
**Date:** 2026-09-21

## Context

The card is embedded in other people's READMEs. What happens when a resolve fails is not a
technical detail — it is the most visible thing this product can do.

## Options considered

**A — Correct HTTP semantics: 404 for a missing repo, 429 for rate limits, 500 for a
render failure.**
Honest and standard. The result in a README is a broken-image icon, in someone else's
repo, that they will not know how to debug and may not notice for months. Camo also caches
failures with its own logic, so a transient 500 can stick around.

**B — Always 200, always `image/png`, with the failure explained inside the image.**
Semantically wrong. Operationally correct.

## Decision

B, for the PNG route only. The JSON API at `/api/resolve` keeps correct status codes,
because its consumer is our own site and it needs to distinguish failures.

A card reading _"Couldn't read octocat/hello — no manifest files found"_ in someone's
README is self-debugging. A broken-image icon is not.

## Consequences

- Monitoring cannot rely on status codes for this route. Error cards must increment a
  counter explicitly, by reason, or failures become invisible.
- The error card is a real design surface: it has to look intentional rather than like a
  crash, and it must render in both themes. It uses the normal palette — **no red**. A red
  card in a README would be alarming and out of proportion.
- Error responses need a short `s-maxage` (10 minutes) rather than the 24h of a success,
  so a transient failure or a newly-public repo recovers quickly.
- This inverts the usual instinct, so it needs to be stated loudly in `CLAUDE.md` or it
  will be "fixed" by a future contributor.

## What would make us revisit

- A monitoring story emerges that genuinely needs status codes. Even then, prefer a
  response header (`x-stackshot-error: no-manifest`) over changing the status.
