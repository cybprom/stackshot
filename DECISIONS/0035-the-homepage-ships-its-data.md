# ADR-0035: The homepage ships its data, and renders its one card at build

**Status:** Accepted
**Date:** 2026-10-04

## Context

Three things on the homepage need a resolved stack before a visitor arrives: the intro card
(`cybprom/stackshot`, which layout C generates ~0.9s after load), the drifting wall of
mini-cards behind C's panel, and the nav's star count. The ROADMAP had always treated these
as one requirement rather than three ad hoc ones.

The requirement is absolute: **the homepage never waits on GitHub, on any path.** Not on a
cold cache, not after an eviction, not during a GitHub outage.

## Options considered

**A — Warm the Redis cache at deploy.** The obvious reading of "prepared ahead of time",
and it fails on its own terms. `stack:` is 30 days, `png:` is 7, and Upstash eviction is on
(ARCHITECTURE, Caching). After any of those the first visitor pays a cold resolve for the
one card that must never wait — and pays it on the slowest possible path, because a cold
homepage is also a cold function. A cache cannot be made into a guarantee by writing to it
early.

**B — Resolve during `next build`.** No stale data, nothing committed. But the build then
depends on GitHub, so a GitHub outage or a rate limit becomes a failed deploy. Trading "the
homepage is briefly stale" for "we cannot ship" is the wrong direction.

**C — Commit the rendered PNGs.** Guarantees the bytes, and they rot: the moment a token or
a type step moves, the committed cards disagree with every other card the site serves, and
nothing says so. It also puts ~4MB of binaries in the repo for a page that re-renders them
in a second.

**D — Commit the data; render at build.**

## Decision

**D, split exactly along where the network is.**

**The data is committed.** `scripts/prepare-home.ts` resolves the fixed list and writes
`lib/home-data.json`: a `StackDoc` per repo, `cybprom/stackshot`'s star count, and a
`generatedAt` stamp. Refreshing it is a human running a script, never a build and never a
cron — 32 API calls against a 5,000/hour budget, but a shared quota is not something to put
on a timer.

**The pixels are built.** `scripts/render-intro.ts` renders the intro card's four PNGs into
`public/` during the build, from the committed doc. Rendering needs no network, so **the
build can never fail on GitHub**, and because the bytes are not committed they cannot
disagree with the renderer — a `RENDER_VERSION` bump simply redraws them. The wall needs no
PNGs at all: its mini-cards are HTML in the design, so they are server-rendered from the
same docs.

**The star count is cached server-side with roughly hourly revalidation, falling back to
the committed number.** Live enough to be worth showing, and the page never waits on it.

### What the build does when the committed doc and the renderer disagree

Three kinds of disagreement, and only one is the build's business.

**Schema drift fails the build.** `scripts/check-home.ts` runs before `next build`, beside
`check-env.ts`, and validates the file against `StackDocSchema` and against the repo list —
naming the repo, the field and the fix. This is the case that actually bites: `symbol` was
added to `StackItem` after the first cards shipped, and a doc written before it renders
blank tiles in silence.

**Being loud here is safe precisely because of this ADR.** Validation needs no network, so
a red build always means a real mismatch and never means GitHub was down. That is the
property option D bought, and strictness is what it should be spent on.

**Staleness warns and ships.** A valid doc that predates a map or detector change is not
worth refusing a deploy over — the intro card is a demonstration, not a claim of
freshness. But the intro card is also the first thing every visitor sees, so silence is
wrong too: the build prints the data's age on every run and warns loudly past 30 days.

**A moved renderer is self-correcting**, which is the whole reason the render is in the
build rather than in the repo.

## Consequences

- **One `StackDocSchema`, now in `lib/stack-doc.ts`** and shared with `lib/cache.ts`, which
  held the only copy. Two readers of one structural shape would have drifted.
- **The two readers answer a mismatch differently, and should.** KV treats it as a *miss*
  and re-resolves, because there is a network and a budget at request time. The committed
  file fails the build, because by this ADR there deliberately is not one. Same problem,
  opposite answer, for a reason worth writing down.
- **The intro card loses M3's pre-warm.** Its preview URL is now `/intro-tiles-light.png`
  rather than the card route, so loading the homepage no longer warms the CDN entry the
  snippet for `cybprom/stackshot` hands out. The snippet still names the route URL, and
  every card a visitor actually generates is unaffected. This is the price of the
  guarantee and it is charged to exactly one card.
- **The wall list is curated against rendered output, not chosen on paper.** The first pass
  put `facebook/react`, `tailwindlabs/tailwindcss` and `django/django` on it, and all three
  render badly for one reason: **Stackshot reads dependencies, and a repo does not depend
  on itself**, so a library's own card never names the library. React's card said
  `frontend: Zod`; Django's was three cells, one of them Biome. Applications are the right
  shape for this wall, and `tests/home.test.ts` now asserts a six-tile floor so the next
  bad addition fails rather than appearing as a blank in the background.
- `public/intro-*.png` is gitignored.

## What would make us revisit

- **The data going stale in practice.** The 30-day warning is a prompt, not a mechanism; if
  it is routinely ignored, the answer is a scheduled job that opens a PR with a refreshed
  file, not a build that resolves.
- **The wall wanting more than sixteen repos.** The cost is linear in review time, which is
  the binding constraint rather than quota.
