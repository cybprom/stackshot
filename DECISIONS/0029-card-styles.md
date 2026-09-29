# ADR-0029: The card becomes a choice of styles

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** DESIGN.md SELF-CRITIQUE #2 (colour-coded layers), DESIGN.md COLOR's
"one accent, nothing else", CLAUDE.md's "custom themes" scope line

## Context

Stackshot has shipped one card: the Datasheet, whose hierarchy comes from rule weight and
whose only colour is a 4-unit accent bar. Four further styles were designed — Tiles,
Terminal, Tags, Datasheet-tuned — and the product becomes a choice among them, launching
with Tiles as the default and Terminal beside it.

This is not a small addition. It reverses three decisions that were argued explicitly, and
naming them is most of the point of this record.

## The three reversals

**1. "No custom themes" was an explicit scope line.** CLAUDE.md lists custom themes among
the things that "do not get built, prototyped, or accommodated for later", and instructs
that a task appearing to require one should stop rather than build toward it. A style
switcher is not a theme editor — there is a fixed, curated set and no user-supplied
values — but it is close enough that pretending otherwise would be dishonest. The scope
line is amended, not quietly reinterpreted.

**2. Colour-coded layers were considered and rejected.** DESIGN's self-critique #2 reads:
"Four colors for four categories is what every diagram tool does, and it would have
silently broken the one-accent rule while adding zero information that vertical position
wasn't already carrying." Every new style colours its layers. The argument that overturns
it is narrow: **vertical position stops carrying the information once the layout stops
being four stacked bands.** Tiles is a wrapping grid and Tags is a wrapping flow; neither
has a y-axis to read. Colour is not decoration there, it is the only thing left encoding
the layer, which is precisely the condition the original argument said did not hold.

The Datasheet keeps rule-weight encoding and gains colour only as a marker. Where vertical
position still works, it is still the primary encoding.

**3. The palette grows past one accent.** Five tokens per theme become thirteen: eight
layer values (a colour and a tint for each of four layers) on top of the five. `accent`
itself is untouched and still means exactly one thing — the bar at the card's top edge and
the site's focus ring. What is abandoned is the stronger claim that the whole card carries
no colour but that one.

## Decision

Styles are a URL-level choice, and the URL is the contract.

```
/{owner}/{repo}/{style}-{theme}.png      tiles-dark.png, terminal-light.png
/{owner}/{repo}/card-{theme}.png         pinned to Tiles, forever
```

**`card-{theme}.png` is pinned to a named style, not to "whatever the default is."** This
is the load-bearing detail. A badge in someone's README is a URL we do not control and
cannot migrate; if that file tracked a moving default, changing the site's default would
restyle every card already embedded, without the author touching anything. So
`LEGACY_STYLE` is a constant that is never intended to move, and **the site always writes
the explicit style into the snippet it hands out** — `tiles-dark.png`, never
`card-dark.png`. `card-*` exists only for URLs embedded before styles existed. A test
asserts the snippet never emits it.

Nothing has been embedded yet, so choosing Tiles here is free today and irreversible
tomorrow.

**The PNG cache key gains the style; the `stack:` and `repo:` keys do not.** A style
changes how a `StackDoc` is drawn, not what it contains, so switching styles costs renders
and never GitHub budget. That is what makes a style switcher on the site affordable at
all.

**Every style shares the header, the footer and the layer colours**, so a card is
recognisably Stackshot whichever one it is drawn in. The styles differ in how items are
arranged, not in what a Stackshot card is.

## Consequences

- **Storage grows per style, and Tiles is the expensive one.** ~332 KB base64 per stack
  against the Datasheet's ~275 KB, once the three-row cap is applied; ~452 KB without it.
  Two answers, both taken: the `png:` TTL drops from 30 days to **7**, because a PNG costs
  function time and zero GitHub budget to redraw while a `StackDoc` costs the budget; and
  **Upstash eviction is on**, so a full database drops old keys instead of failing writes.
  Milestone 4 still watches bytes, but it is watching a cache that degrades rather than one
  that stops.
- **Tiles is content-height, capped at three rows.** Uncapped it reached 1200×1289 for a
  dense repo — a portrait block taller than the laptop screen reading it, which is not a
  shape a README absorbs. Capped it is 1200×869, near the Datasheet's 1200×800, and about
  a quarter cheaper to store. Past fifteen cells the rest becomes `+N more`, and **every
  layer present keeps at least one item tile**, so a lone backend cannot be crowded out by
  a six-deep tooling layer: the layer set is the thing the card exists to show.
  `lib/render/tiles-layout.ts`. The `<picture>` snippet already pins no `width` or
  `height`, a decision made for the error card's different aspect ratio, which now pays
  for a second reason.
- **Tiles puts item names below the legibility floor, deliberately.** DESIGN fixed 0.29
  px/unit — GitHub's mobile apps — as the ratio that governs, and 8.75px as the floor for
  anything that must be read. A tile name is 23 units, or 6.7px there. The symbol is 64
  units, or 18.6px. **Symbols carry the card at thumbnail size and names are for up
  close**, which is the periodic-table metaphor working as intended rather than a
  regression.

  **Verified, not assumed.** Read in the GitHub mobile app from
  `docs/spike/styles/README.md` on 2026-09-29, where the two themes sit side by side in a
  table and are therefore *smaller than a README would render them*. The symbols were
  legible at that size. The direction stands on evidence from the surface that governs,
  which is what ADR-0011 established as the bar.
- **Each style needs a two-letter symbol per map entry**, 225 of them, unique. They are
  committed data rather than derived at runtime, because a symbol is baked into every
  cached PNG containing it: deriving them would make a symbol depend on map order, so
  adding one entry could silently change another's and invalidate cards that were never
  touched.
- **A style is built twice** — a Satori tree for the PNG and an HTML component for the
  site's preview. The duplication is deliberate: the preview crossfades into the real PNG,
  so a drift between the two implementations is visible rather than theoretical. It is
  also what keeps the style switcher from writing a PNG per flip.
- Each style replacing its stand-in **bumps `RENDER_VERSION`**, or PNGs cached under a
  style's key while it was drawn by another style would be served as the real thing.

## What would make us revisit

- **A style nobody picks.** The copy counter in ADR-0012 already records what is handed
  out; if a style is never copied, it is carrying four categories of cost for nothing and
  should be removed rather than maintained.
- **KV bytes.** If storage binds before Milestone 4's monitoring is in place, the answer is
  to stop caching non-default styles rather than to remove them: the CDN still absorbs
  repeat requests, and a re-render costs function time rather than API budget.
- **The symbols failing on a phone.** If the Tiles card is not readable at 0.29 by its
  symbols, the fix is bigger tiles and fewer of them, not smaller type — the same verdict
  ADR-0011 reached for the Datasheet.
