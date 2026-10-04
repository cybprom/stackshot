# ADR-0034: A style with no renderer 404s rather than borrowing one

**Status:** Accepted
**Date:** 2026-10-04

## Context

`CARD_STYLE_DEFS` mapped every name in `CARD_STYLES` to a renderer, because the type system
required it to be exhaustive. Tags has no tree of its own and is post-launch, so it was
mapped to the Datasheet's as a stand-in.

The consequence: `GET /{owner}/{repo}/tags-dark.png` returned 200 with a Datasheet. Nobody
was served a wrong card in practice — the site never offers Tags, so no snippet contains
that URL — but **the URL said one thing and the bytes were another**, and it would have
stayed that way for however long Tags took.

The exhaustiveness that caused this was a good instinct aimed at the wrong set. It
guaranteed "every name resolves to pixels", when what matters is "every URL serves the
pixels it names".

## Options considered

**A — Ship Tags now.** The honest fix, and out of scope: Tags is post-launch, and pulling
it forward to settle a question of URL hygiene trades a week against a lie nobody can
currently reach.

**B — Leave it until Tags ships.** Costs nothing today. But the stand-in is invisible by
construction — it looks like a working style to every test and every type check — and the
thing that makes it safe (the site never offers Tags) is a convention, not a mechanism.
Anyone hand-writing a URL, or any future code that iterates `CARD_STYLES` to build one,
walks into it.

**C — 404 the styles that have no renderer.**

## Decision

**C.** `SERVED_STYLES` is the subset of `CARD_STYLES` with a renderer, and `parseCardFile`
returns `undefined` for anything else — the same answer it already gives an unknown name.

**This needed care, and the care is the interesting part.** I5 says a card request always
returns 200 with an image, because a broken image in a stranger's README is the worst thing
this project can do. A 404 here does not breach it: `tags-dark.png` is **not a card
request**. It is in the same class as `tiles-light.jpg` or `Tiles-light.png` — a filename
the route does not recognise — and the route already answers those with a plain 404, before
any resolve, any render and any budget. I5 governs what happens to a card request that
fails; this is a request that was never a card request.

**The stand-in is deleted, not flagged.** `CARD_STYLE_DEFS` is now exhaustive over
`SERVED_STYLES`, so Tags is simply absent rather than present-but-wrong. Shipping Tags is
three edits: a name in `SERVED_STYLES`, an entry in `CARD_STYLE_DEFS`, and a
`RENDER_VERSION` bump.

**Tags keeps its name in `CARD_STYLES`.** The URL grammar and the `png:` cache key space
were settled in ADR-0029 and are final; removing the name would reopen both for a style we
intend to ship.

## Consequences

- **The type system found every place that had assumed Tags was renderable**: `styleDef`,
  `serveCard`, `renderErrorCard`, two scripts and four test files. That is the argument for
  encoding this as a type rather than a runtime check — the stand-in had quietly spread,
  and nothing had said so.
- `DEFAULT_STYLE` and `LEGACY_STYLE` are typed `ServedStyle`. Neither could ever have been
  a style with no renderer, and now neither can be made one.
- **`RENDER_VERSION` is not bumped.** Nothing that renders changed. The `png:v4:tags:*`
  keys that a stand-in may have written are now unreachable rather than wrong, and they
  expire on the 7-day TTL.
- There are now three style sets, and each has a reason: `CARD_STYLES` is what the URL
  grammar knows, `SERVED_STYLES` is what has a renderer, `LAUNCH_STYLES` (in `lib/preview`)
  is what the site offers in the switcher because it also has an HTML preview.

## What would make us revisit

- **Tags ships.** Then `SERVED_STYLES` grows and this ADR is spent, except for the rule it
  establishes: a style earns a URL by having a renderer.
- **A fourth style is wanted in the URL grammar before it is drawn.** The rule holds — name
  it in `CARD_STYLES`, leave it out of `SERVED_STYLES`, and its URL 404s until it is real.
