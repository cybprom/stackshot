# ADR-0041: Each answer gets fresh preview bytes

**Status:** Accepted
**Date:** 2026-11-11
**Supersedes in part:** ADR-0032's "the CDN entry the snippet hands out is the one this fetches"

## Context

The author generated vercel/next.js twice. The first try failed, and the card route served
the error card with `max-age=60, s-maxage=60`, as ADR-0027 intends. The second try
resolved, so the page drew the HTML card, and then crossfaded to the same PNG URL. The
browser, or the CDN, still held the error card from a minute ago, so a working repo ended
on its own error card. GOTCHAS 070.

The preview had been using the snippet's exact URL on purpose: loading the preview warmed
the CDN entry the README would fetch (M3's pre-warm).

## Options considered

**A — Keep the shared URL and stop caching error cards.** Fixes this case, but ADR-0027's
60 seconds exist to stop a burst of Camo fetches re-running a failing resolve. It trades a
page glitch for load on the scarce thing.

**B — Detect a mismatched PNG and retry once with a cache-busting query.** Keeps the
pre-warm, but the downloads would still save the stale file, and it needs the page to infer
an error card from its height.

**C — Version the preview's URL per answer.** Every Generate gets its own `?v=`, so nothing
cached from an earlier attempt is reused, by the browser or the CDN. The snippet's URL is
unchanged.

## Decision

**C.** The preview and the two download links carry `?v=<time of the answer>`. The route
ignores the query, so the bytes are the same card.

## Consequences

- **The CDN pre-warm is gone, the useful half survives.** The preview no longer fills the
  CDN entry the snippet names. It still makes the route render and store both PNGs in
  Redis, so the README's first fetch is a Redis read and no render.
- Every Generate is a function invocation for its PNGs rather than a possible CDN hit. They
  are Redis reads, and a person clicking Generate is not a volume problem.
- A genuine error card still shows, and the frame still follows its height (GOTCHAS 063).

## What would make us revisit

- Camo's first fetch of a fresh embed proves slow enough that the CDN pre-warm mattered,
  which the Redis read should make unlikely.
