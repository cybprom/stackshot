# ADR-0026: The whole cache chain, and an explicit `max-age`

**Status:** Accepted
**Date:** 2026-09-25
**Amends:** ADR-0013, which deferred the downstream value to Milestone 2

## Context

ADR-0013 established that Camo has no TTL of its own: it honours the origin's
`cache-control` and passes it through. It deferred the actual numbers to Milestone 2, which
is this step. There are four caches between the render and the reader, not the two the
project assumed at the start:

```
origin ─▶ Vercel edge ─▶ Fastly ─▶ Camo ─▶ browser
```

The spike found the trap the hard way (see the comment that stood in the spike route):
**Vercel consumes `s-maxage` and forwards the rest.** A header of bare `public` therefore
reaches Fastly and Camo with no freshness directive at all, and both fall back to
*heuristic freshness* — a fraction of the `Last-Modified` age, chosen by the proxy, which
we neither set nor control. The failure is quiet: everything works, and the refresh
behaviour is someone else's default.

## Decision

Every response carries an explicit `max-age` alongside `s-maxage`.

| | Success | Error |
|---|---|---|
| `max-age` (Fastly, Camo, browser) | 3600 | 300 |
| `s-maxage` (Vercel edge) | 86400 | 600 |
| `stale-while-revalidate` | 604800 | — |

```
success: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800
error:   public, max-age=300,  s-maxage=600
```

Error responses are short on both because the two things that produce them — a transient
failure, and a repo that was private and is now public — both want a fast recovery. A day
of cached "repo not found" in someone's README for a repo that now exists is the worst
version of ADR-0007's bargain.

## End-to-end staleness

Worst case is the sum along the chain, not the maximum: each cache can serve a response it
fetched just before the one above it expired.

- **Success: up to 25 hours** before a changed stack is certain to reach a reader —
  24h at the Vercel edge plus 1h downstream. With `stale-while-revalidate`, a reader can
  see a stale card for up to 7 days *while* a fresh one is fetched behind them, which is
  the intended trade: never a slow card, occasionally an old one.
- **Error: up to 15 minutes** — 10m edge plus 5m downstream.

**The dominant term is ours.** The 24h `s-maxage` at our own edge, keyed by URL with no
deploy of ours to invalidate it when a repo's stack changes, is what governs. Tuning the
downstream value while leaving `s-maxage=86400` in place buys refetch traffic and nothing
else — which is exactly what ADR-0013 predicted and is now settled rather than assumed.

The KV layers add no staleness at all: `stack:` and `png:` are keyed by content hash, so a
changed stack produces different keys. Only the 1h repo pointer adds any, and it is
dominated by the edge.

## Consequences

- A repo that changes its stack is stale for a day at the edge. For a card that names
  major versions only, that is proportionate: patch and minor bumps change nothing on the
  card at all (ADR-0008).
- `PURGE` against a Camo URL works (GOTCHAS 008), so there is a manual escape for a
  specific card. There is no bulk invalidation and we are not building one.
- The numbers are now in one place in code — the two constants at the top of the card
  route — rather than implied by a mix of defaults. A future change is one edit and this
  ADR is the reason it needs an argument.
- Monitoring cannot use status codes on this route (ADR-0007), and now cannot use cache
  headers to distinguish either, since both card kinds are `public`. `x-stackshot-error`
  is the discriminator.

## What would make us revisit

- Readers report cards that are visibly out of date in a way a day does not explain, which
  would mean a cache in the chain is not honouring what we send and the assumption behind
  these numbers is wrong.
- The site gains a "refresh this card" action, which needs a purge path rather than a TTL.
