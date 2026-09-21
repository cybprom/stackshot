# ADR-0013: Downstream `max-age` is the staleness lever for embedded cards

**Status:** Accepted
**Date:** 2026-09-21

## Context

The project was planned around an assumption stated in ARCHITECTURE.md and GOTCHAS 008:
Camo's cache TTL is undocumented, and if it turned out to be long, embedded cards would be
"effectively immutable once embedded" and that would become a README limitation.

Milestone 0 step 6 measured it. The assumption is wrong, in the useful direction.

**Camo honours the origin's `cache-control`, and returns it verbatim to the reader.** With
`public, max-age=300` in force, a cached copy that was 102 seconds old when the origin
changed served stale until age 300 and refetched immediately after — measured at t+246s
against a predicted expiry of t+198s, with the last stale read at t+185s. Propagation delay
is the remaining TTL of whatever Camo already holds, and nothing else.

Separately, **`PURGE` against a Camo URL works**: a node warm at `age=27` reset to `age=0`
after a purge returning `{"status":"ok"}`.

A second discovery shaped this: there is a **Fastly layer in front of Camo**, so the chain
is origin → Vercel edge → Fastly → Camo → browser. And Vercel consumes `s-maxage` without
forwarding it, so unless an explicit `max-age` is set the downstream chain receives bare
`public` and falls back to heuristic freshness — which is what was happening by accident
(GOTCHAS 019).

## Options considered

**A — Send no downstream `max-age`.**
What the code did before this was noticed. Downstream caching is then undefined and every
layer applies its own heuristic. Zero control, and the behaviour is an accident rather than
a choice. It also makes the TTL unmeasurable, because there is no stated value to compare
an observation against.

**B — Send an explicit downstream `max-age`, and treat it as a product parameter.**
Staleness becomes a number we choose. Costs: every expiry causes a refetch from each Fastly
node holding the card, so a short value multiplies requests against our CDN.

**C — Rely on `PURGE` alone, with a long or absent `max-age`.**
Cards stay cached until explicitly purged. Appealing, but it requires knowing *which* Camo
URLs to purge, and a Camo URL is an HMAC of the source URL that only appears in rendered
README HTML. We cannot enumerate the READMEs embedding a card — that is the same
unmeasurability that ADR-0012 is built around. Purge is a tool we can use for a card we
know about, not a general mechanism.

## Correction, same day: what the measurement does and does not prove

The first draft of this ADR overstated the lever, and the error is worth keeping visible
because it is easy to repeat.

**Every byte change in the spike arrived with a Vercel deploy, and a deploy wipes our edge
cache.** So when Camo's `max-age` expired and it refetched, it reached a fresh origin. That
is not the production path. In production a card's content changes because *someone else
pushes to their repo* — no deploy of ours occurs. Camo expires on schedule, refetches, and
hits our Vercel edge, which is holding `s-maxage=86400` plus `stale-while-revalidate=7d`,
and is handed **the same stale PNG** it already had.

End-to-end staleness is the **maximum over the whole chain**, not Camo's term alone:

```
KV repo pointer        1h
KV stack doc / png     30d   (keyed by content hash, so not a staleness term — ADR-0005)
Vercel edge            s-maxage 24h + SWR 7d     <- dominant, and ours
Fastly + Camo          our max-age               <- the term this ADR measured
browser                our max-age
```

The dominant term is upstream of Camo and entirely under our control. What step 6 proved is
narrower than "we control staleness": it proved **the downstream end is not an opaque
blocker**, which is precisely what makes tuning the upstream values worthwhile. Had Camo
turned out to hold images for a week regardless of headers, no amount of edge tuning would
have mattered and the README limitation would have been unavoidable.

**Milestone 2 therefore decides the whole chain, not `max-age` alone.** A short downstream
`max-age` paired with a 24-hour edge `s-maxage` buys nothing except refetch traffic.

## Decision

**B.** The card route sets an explicit downstream `max-age` alongside the edge directives:

```
cache-control: public, max-age=<N>, s-maxage=86400, stale-while-revalidate=604800
```

`PURGE` is retained as a manual escape hatch for a specific known URL, not as the primary
mechanism — C's enumeration problem is fatal to it as a strategy.

The spike ran at `N=300`. That value was chosen as a **measuring instrument**, not a
product setting: no plausible proxy default lands on five minutes, so "updated in ~5 min"
and "updated in hours" could not be confused. It should not survive into production
unexamined merely because it is what the spike used.

**Production value is deferred to Milestone 2**, when the card route is built for real, and
is recorded here as the one open parameter of this decision. The tradeoff is bounded on both
ends: refetches hit the Vercel CDN rather than the render function, so a short value is
cheap but not free, and cards change rarely — a stack changes on the order of weeks, so
hours of staleness costs a reader almost nothing.

## Consequences

- **The README limitation that was planned for does not need writing.** Embedded cards are
  not immutable. Whatever the README says about staleness, it can state a number — but that
  number is the chain's maximum, currently dominated by our own edge `s-maxage`, not by
  Camo. See the correction above before quoting `max-age` as if it were the answer.
- Downstream `max-age` is now a deliberate lever, which means it is also a thing that can be
  set wrongly. It belongs in `lib/tokens.ts`-adjacent config or the route constant, with a
  comment, not scattered.
- The value interacts with nothing else in the cache stack: `s-maxage` governs the Vercel
  edge independently, and the render cache is keyed by content hash (ADR-0005), so changing
  `max-age` never causes a re-render.
- We inherit a dependency on Camo continuing to honour origin `cache-control`. It is
  undocumented behaviour, measured once. If it changes, cards get staler and nothing breaks
  loudly — so the README should describe staleness in terms of intent, not as a guarantee.
- `PURGE` working is worth knowing but is not in any automated path. Using it requires the
  Camo URL, which requires reading the rendered HTML of a README we know about.

## What would make us revisit

- A measurement showing Camo no longer honours `max-age` — re-run step 6's method against
  the live card, which takes under ten minutes now that the harness exists.
- Refetch volume against the CDN becoming a cost line rather than a rounding error.
- A product reason to make cards update near-instantly, which would mean a short `max-age`
  and accepting the request volume.
