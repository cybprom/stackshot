# ADR-0012: Measure embeds and intent, not views

**Status:** Accepted
**Date:** 2026-09-21

## Context

Stackshot exists partly as a distribution mechanic: every README that embeds the badge
advertises the tool. Knowing whether that is working requires some measurement.

The constraint is that **the primary channel is structurally unmeasurable**. GitHub proxies
every README image through Camo, which fetches once and serves every subsequent reader from
its own infrastructure. Our server is never hit by a reader. There is no referer, no user
agent, no per-view count, and no way to construct one. See ADR-0003 and GOTCHAS 001.

So the question is not "which analytics tool" but "what can honestly be counted".

## Options considered

**A — No analytics at all.**
Zero work, keeps the project small. But it leaves the one question the project exists to
answer ("is anyone embedding this?") permanently unanswered, and it gives the public
writeup no numbers.

**B — A third-party product analytics tool (PostHog, GA, Plausible).**
Dashboards, funnels, retention. All of it measures the _site_, which is the part that
barely matters, and none of it can see the embedded cards. GA additionally brings a
cookie-consent obligation for a meaningful share of the audience, in exchange for data we
don't need.

**C — Bounded server-side measurement: Redis counters, a weekly GitHub code-search embed
count, and Vercel Web Analytics for pageviews.**

## Decision

C, with **embed count as the north-star metric**.

**1. Embed count (weekly).** A scheduled script runs a GitHub code search for the domain
string across README files and appends the result to a file in the repo:

```
GET /search/code?q="stackshot.<domain>"+in:file+filename:README.md
```

This undercounts — code search indexing is incomplete and private repos are invisible —
but it measures the exact thing the project is for, and its trend is real even if its
absolute value isn't.

**2. Redis counters**, in the instance already used for caching. Roughly 20 lines, no third
party, no consent banner, no client-side tracking:

- resolves attempted / succeeded / failed, bucketed by failure reason
- distinct repos resolved
- **embed snippet copied** — the strongest intent signal available
- PNG downloaded
- unmapped package ids with frequency (already planned in ADR-0006)

The copy-rate against resolve count is the only conversion question worth asking: did
people come to look, or come to embed?

**3. Vercel Web Analytics** for site pageviews. One component, cookie-free, already on the
platform.

Exposed via `GET /api/stats` returning JSON behind a shared secret. No dashboard.

## Consequences

- **View counts will never exist**, and the README, the writeup, and any future claim about
  reach must say so rather than estimating. This is a constraint to state plainly, not to
  work around.
- Counters are approximate by design: they miss CDN-served responses entirely, so "resolves"
  means "cold resolves" and will undercount as caching improves. Interpret the trend, not
  the number.
- The unmapped-package log does double duty as the product backlog and as the only real
  signal of what repos people are actually pointing at.
- No consent banner is required, because nothing identifies a person and nothing is stored
  client-side.
- Scope creep risk is high here — analytics is the classic place a weekend project grows a
  dashboard. `CLAUDE.md` names the boundary explicitly.
- Budget: ~1 hour, in Milestone 4.

**One unverified idea, deferred to roughly two weeks post-launch:** Camo refetches an image
when its own cache expires, and those requests do hit our server with a recognizable user
agent. That is not a view count, but it may be a _liveness_ count — evidence that a card is
still embedded somewhere.

This was originally scoped as a Milestone 0 step. It cannot be tested there. Camo refetches
under traffic, and the spike's embed sits in a throwaway repo nobody visits, so there is
nothing to trigger a refetch and no pattern to recognize; borrowing a busy repo would
measure that repo rather than the mechanism. The test needs our own cards embedded in real
READMEs first, which is why it waits until a couple of weeks after launch. See GOTCHAS 013.

It remains an input to this ADR, not a new decision — if the pattern turns out to be
illegible, the idea is dropped and noted in GOTCHAS, exactly as before.

## What would make us revisit

- Embed count grows past a few hundred repos, at which point knowing _which_ repos (and
  therefore which ecosystems to extend the map for) becomes worth more than the total.
- The Camo liveness signal turns out to be real and stable.
- A concrete decision comes up that the current counters can't inform. Add the counter for
  that decision, not a tool.
