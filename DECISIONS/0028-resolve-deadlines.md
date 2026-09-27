# ADR-0028: Keep the resolve deadlines at 2500 / 4000

**Status:** Accepted
**Date:** 2026-09-27
**Closes:** GOTCHAS 027, open since 2026-09-22

## Context

`PER_FETCH_MS = 2500` and `RESOLVE_DEADLINE_MS = 4000` were chosen on the M0 plan's
reasoning — a ~2.4s cold render inside an 8s working estimate for Camo — before anything
had been measured. GOTCHAS 027 then recorded that both failed repeatedly against the repos
a stranger would paste first, from the author's machine in Lagos, and left the values open
pending a deployed measurement.

The pressure to widen them was real. `vercel/next.js` sat at 90% of the deadline and 91%
of the per-fetch limit at once, and both `next.js` and `pmndrs/zustand` timed out live
during Milestone 2, producing error cards for repos that resolve correctly.

## The measurement

Deployed to `stackshot-one.vercel.app`, region `iad1`, against the stable production alias
with the CDN bypassed so every request reached the function. Full numbers in GOTCHAS 027.

```
vercel/next.js, 7 consecutive cold resolves, server-side
  graphql   435–798      (median 557)
  tree     1140–1370     (median 1287)     <- the only phase near a limit
  raw       107–401      (six files, parallel)
  total    1754–2394     (median 2051)
```

Nothing timed out, on any repo, in any deployed run.

```
limit                     binds on          worst measured   margin    headroom
PER_FETCH_MS 2500         next.js tree         1370 ms       1.82×     1130 ms
RESOLVE_DEADLINE_MS 4000  next.js total        2394 ms       1.67×     1606 ms
```

Phase by phase, `iad1` is ~1.5× faster than Lagos, and the tree call's worst case improves
1.7×. GraphQL improves least (821 → 557 median), which says its latency is mostly GitHub
thinking rather than distance — worth knowing, because it means the one phase we cannot
speed up by moving closer is also the one with the widest spread.

## Options considered

**A — Keep 2500 / 4000.** Margins above, proven over seven consecutive cold runs of the
largest repo in the fixture set. No change, no new failure mode.

**B — Widen to 3000 / 5000.** Margins become 2.19× and 2.09×. Costs a second of held
function time on a genuinely hung resolve, and pushes worst-case function time to roughly
6.8s (5s resolve + ~0.9s render + ~0.9s cold start) against an 8s estimate that is itself
unmeasured.

**C — Split by route.** The card route keeps 4000 because Camo is waiting. `POST
/api/resolve` gets ~10000 because a human is waiting and can afford it.

## Decision

**A now, C when `/api/resolve` lands at Milestone 2 step 4. Not B.**

The Lagos failures were a client-side artefact. Widening a production limit because a
different network was slow is how a limit stops meaning anything: the number would no
longer correspond to any condition we had observed in the environment it governs, and the
next person to see a timeout would have no basis for choosing between 5000 and 8000 either.
1.67× on the largest realistic repo, measured seven times without a failure, is a real
margin and the data does not justify spending it.

C is not a hedge against this decision — it is a separate route with a separate constraint.
It also changes the shape of the problem rather than the number: a resolve through the site
writes the same KV entries the card route reads, so by the time anyone pastes a `<picture>`
snippet into a README, the card route is a cache hit. That makes pre-warming the normal
path and leaves the card route's 4s binding only for a badge whose cache has expired or a
URL typed by hand.

## Consequences

- A repo materially larger than `next.js` — 12.7 MB tree, 32,826 entries — will time out
  where a wider limit might not have. That is the accepted cost, and the failure is a
  `timeout`, which ADR-0027 now caches for 60 seconds rather than ten minutes, so it
  recovers on its own.
- The tree call is the only phase anywhere near a limit and is therefore the thing to
  watch. If anything moves, it moves there first.
- Cache round trips are not a factor and should not be confused for one. Measured from
  `iad1`, Upstash reads run 4–106 ms with a 4 ms floor, which confirms same-region (US
  East) placement; a warm request's entire server-side cache work is 15–50 ms typical
  against a `CACHE_TIMEOUT_MS` of 500. They also sit outside the resolve deadline
  entirely, since the client is constructed after them (GOTCHAS 042).
- Cold start is ~900 ms and independent of all of this. The deadline does not govern it,
  and a cold function serving a warm cache never resolves at all.

## What would make us revisit

**`timeout` appearing in the failure-by-reason counts in production.** Seven runs of one
repo in one session is evidence, not proof: GitHub's API latency varies with its own load,
and a quiet Sunday is not a Monday morning. Milestone 4's counter (ADR-0012) measures this
continuously and across every repo anyone asks for, which is the only thing that can
distinguish "our limit is too tight" from "that session was lucky". **The counter reopens
this ADR, not a single slow request and not another local measurement.**

Two specific triggers beyond that:

- A sustained rise in the `tree` phase — the only phase near a limit — which would show up
  as timeouts concentrated on large repos rather than spread evenly.
- The 8s Camo estimate being measured rather than assumed. It is the working number the
  whole budget is derived from and it has never been verified; if it turns out to be lower,
  option B was never available anyway.
