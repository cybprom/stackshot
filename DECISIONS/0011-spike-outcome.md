# ADR-0011: Milestone 0 spike outcome — go

**Status:** Accepted
**Date:** 2026-09-21

## Context

Milestone 0 existed to answer one question before any real work was committed:

> Does a generated PNG render legibly in a real GitHub README, on both themes, at desktop
> and mobile width, through Camo — and can it be updated?

Detection failing degrades into a sparser card. Rendering failing means there is no
product. Seven steps were run against a throwaway public repo
(`github.com/cybprom/stackshot-spike`) and a dedicated Vercel project, with three pinned
URL paths so that one measurement could not disturb another.

## What was measured

| Question | Result |
|---|---|
| Satori renders the layout | Yes, including the rotated gutter — the signature element |
| `<picture>` theme switching | **All five surfaces, both themes each.** No failures |
| Camo cache behaviour | Honours our `max-age`; `PURGE` also works |
| Cold render vs 8s threshold | **2.39s** worst, method-matched |
| PNG size | 127KB light / 130KB dark |
| Legibility at ~390px | Package names read cleanly; see caveats |
| Worst-case layout | Fits with 141 units of true slack |

Surfaces: desktop web, GitHub mobile web, GitHub iOS app, GitHub Android app — light and
dark on each. Evidence in `docs/spike/step5-*` and `docs/spike/step7-*`.

## Decision

**Go.** Proceed to Milestone 1. Every abandon-or-redesign criterion was tested and none
triggered.

| Criterion | Outcome |
|---|---|
| `<picture>` fails on some surface | Not triggered — five for five |
| Type illegible at ~390px | Not triggered — `card/item` is 8.75px and reads |
| Rotated labels unsupported | Not triggered — works; stacked fallback unused |
| Camo unpurgeable beyond ~24h | Not triggered — TTL is ours, and `PURGE` works |
| Cold render > 8s | Not triggered — 2.39s |
| Satori can't express the layout | Not triggered |

ADR-0003 (two PNGs via `<picture>`) and ADR-0004 (`satori` + `@resvg/resvg-js` on Node)
both stand as written.

## Consequences, including the parts that are not clean

- **The rule-weight hierarchy is not fully rescued on phones.** The `8 · 5 · 3 · 3` ladder
  reads correctly on desktop, but at ~0.29 px/unit the lower rungs land at 1.46px and
  0.88px and compress into "thin". The card reads as one strong rule and three lighter ones
  there. No ladder on a 1200-unit canvas fixes this. Accepted rather than solved.
  GOTCHAS 012 and 022.
- **`card/meta` at 4.67px on a phone is at the edge of legible.** It is the least important
  text on the card, so this is a tolerated weakness, not a good outcome.
- **The accent bar is coupled to canvas height and nothing asserts it.** It can thicken
  freely — verified at 60 units — because bands absorb chrome by shrinking. But every unit
  compresses bands toward the ~103 units the rotated `FRONTEND` label needs, with roughly
  71 units of headroom. Past that the label silently overlaps its neighbour while every
  overflow check still passes. Any future change to the accent bar, the header band, the
  footer or the padding has to be checked against the gutter label, not against overflow.
  GOTCHAS 004 and 021.
- **Staleness is dominated by our own edge, not by Camo.** Step 6 measured the downstream
  end because every spike change came with a deploy, which wipes the Vercel edge. In
  production nothing deploys when someone else's repo changes. Milestone 2 sets the whole
  chain. ADR-0013.
- **Detection is entirely unproven.** The spike rendered hardcoded data. Nothing here says
  anything about whether a real repo yields a card worth looking at — that is Milestone 1's
  judgement call and remains the largest open risk in the project.
- Two toolchain traps are now load-bearing knowledge: Commit Mono's release OTFs crash
  Satori (use the TTFs), and both `satori` and `@resvg/resvg-js` must be
  `serverExternalPackages`. GOTCHAS 015 and 016.

## What would make us revisit

- Milestone 1's eight fixture outputs read as noise rather than as cards — that is a map
  problem, not a spike problem, but it would invalidate the premise this "go" rests on.
- A real repo's card needs three lines per band, which would reopen the 800-unit canvas.
  The worst-case fixture wraps to two, but it is synthetic.
- GitHub changes `<picture>` handling in either app.

## Teardown, owed by this decision

`github.com/cybprom/stackshot-spike` and its Vercel project are **deleted**. Add `spike` to
the reserved-word deny list in Milestone 2 regardless, so `/spike/ttl/card-dark.png` can
never resolve as owner `spike` against the live API — the deny list is what holds once the
repo is gone and nobody remembers why the path mattered.

In the codebase, remove `lib/render/crude-card.tsx`, `scripts/spike-render.ts`,
`scripts/spike-gutter.tsx` and the `spike/*` pins from the card route. Those existed only
to keep two measurements from disturbing each other, and the measurements are done.

**Corrected while carrying this out:** an earlier draft of this section also listed
`lib/spike-doc.ts`, `lib/spike-doc-worst.ts` and `scripts/assert-fits.tsx`. They stay until
Milestone 2, for reasons that were not obvious when the list was written:

- The card route renders `SPIKE_DOC`. Nothing else supplies a `StackDoc` until the resolver
  lands, and there is no error card yet either, so deleting it leaves the route broken
  through the whole of Milestone 1 in exchange for tidiness.
- `WORST_CASE_DOC` is the densest layout the card has to survive and is the natural fixture
  for Milestone 2's gutter-fit test. Deleting it means rebuilding it.
- `assert-fits.tsx` is currently the only automated guard on the layout at all.

They go when Milestone 2 replaces them, which is where the gutter-fit test lands anyway.

**Done, at M2 step 3 (2026-09-25).** `lib/spike-doc.ts`, `lib/spike-doc-worst.ts`,
`scripts/spike-card.tsx` and `scripts/assert-fits.tsx` are deleted; the card route now
resolves for real. Both things this section said would be lost were kept rather than
rebuilt from memory:

- `WORST_CASE_DOC` lives on in `tests/fit.test.ts` as `worstCaseDoc()`, generated from the
  real `STACK_MAP` — every layer full of the longest display names its category actually
  has — which is a better worst case than the hand-written one it replaces.
- `assert-fits.tsx`'s check moved into the same file. See GOTCHAS 041.

## Evidence correction (2026-09-25) — the decision above is unchanged

Two numbers this ADR reasoned from were wrong. Neither changes the verdict, and one of
them was already corrected elsewhere before this note was written.

**The overflow assertion never reported headroom.** `assert-fits.tsx` returned
`maxY=797` on an 800-unit canvas for every card, dense or empty, because the card's root
is `height: 100%` and the lowest ink is always the frame's inner edge. It answered "does
this overflow", never "by how much does it clear". **GOTCHAS 021 caught and corrected this
on 2026-09-21**, four days before the teardown; GOTCHAS 041 records only that the
replacement check finally landed and is now verified able to fail. Measured properly, by
shrinking the canvas until ink spills, across all nine real fixtures rather than the two
spike docs:

```
minimum viable canvas, 4-layer cards   659 units     true slack at 800   141 units
minimum viable canvas, 1-layer card    299 units     true slack at 800   501 units
```

**The rotated `FRONTEND` label is 110.0 units, not the ~103 stated above.** Measured from
satori's own layout pass, which is the engine that lays out the real card:

```
FRONTEND 110.0    TOOLING 96.0    BACKEND 96.0    INFRA 67.0
```

GOTCHAS 004's table (102.4 / 94.3 / 88.6 / 65.9) came from a separate script and reads
5–8% low across the board.

**The accent-bar coupling claim survives intact, and is in fact only consistent with the
corrected figure.** At four layers a band is `(800 − 130 chrome − 140 header − 19 rules)/4
= 127.75`, so FRONTEND clears its band by 17.75 units and four bands absorb `17.75 × 4 =
71` units of extra chrome before the label binds — exactly the "roughly 71 units" above.
With the ~103 figure the arithmetic would have given 99, so the conclusion was right and
its stated input was not.

What did change is the margin against the *other* constraint: FRONTEND clears the 120-unit
band `minHeight` by **10.0 units, not 17.6**. The `minHeight` binds first anyway — 31 units
of chrome, against 71 for the label — so the warning this ADR gives still points at the
right thing, and `tests/fit.test.ts` now asserts both rather than recording them in prose.

`docs/spike/` is the durable record and stays.
