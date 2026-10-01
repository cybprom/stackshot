# ADR-0030: The frame belongs to the style, and the symbol travels in the doc

**Status:** Accepted
**Date:** 2026-09-30
**Amends:** ADR-0029 ("every style shares the header, the footer and the layer colours")
**Supersedes in part:** DESIGN.md COLOR (`surface` is one value per theme),
DESIGN.md SURFACE (radius 2 everywhere, one 3u ink border),
DESIGN.md CARD ANATOMY (the footer carries the domain and nothing else), DESIGN.md TYPE
(Archivo is the repo name and nothing else)

## Context

Phase 2 built the first card style that is not the Datasheet, and two questions had no
answer in the existing records.

**Where does the Tiles symbol come from at render time?** It is a field on `MapEntry`, and
`lib/render/` may not import `lib/stack-map` — CLAUDE.md puts it plainly: the renderer
takes a `StackDoc` and nothing else.

**How much of the Datasheet's chrome is "shared"?** ADR-0029 says every style shares the
header, the footer and the layer colours, which reads as though Tiles should be drawn
inside the Datasheet's frame: a 3-unit ink border, radius 2, an accent bar and an 8-unit
rule under the header. Built that way it is a Datasheet with tiles in it, and the
distinction the styles exist to offer disappears.

## Options considered

**A — The renderer looks the symbol up in `STACK_MAP`.**
Smallest diff, and no cached data changes. Breaks the stated import boundary, needs a
fallback for a lookup that invariant I3 says cannot miss, and leaves the site's HTML
preview (Phase 4) with no way to draw a tile short of shipping all 225 entries and their
descriptions to the browser.

**B — `symbol` becomes a field on `StackItem`.**
The boundary holds untouched and `/api/resolve` carries what the preview needs. It changes
the shape of `StackDoc`, so every `stackHash` moves.

**C — Tiles in the Datasheet's frame**, with only the grid replaced.
One frame to maintain, and a card that is recognisably ours. It is also not the card that
was designed: `docs/design/directions/tiles.dc.html` has a hairline border, a 20-unit
radius, no accent bar and a legend in the bottom row.

**D — The frame is per style; the header's content and type treatment are shared.**
The styles differ in more than arrangement, which is what was actually drawn. Costs a
split of `chrome.tsx` and a handful of DESIGN rules that were written when there was one
card.

## Decision

**B and D.** `symbol` is a required field on `StackItem`, set in `lib/normalize.ts` from
the map entry. The frame belongs to the style; what is shared is content and type.

| Shared by every style | The style's own |
|---|---|
| `CardHeader` — owner, name with the `displaySize` ladder and its two-line clamp, language, stars | The card surface, border weight and colour, radius, accent bar, any rule under the header |
| The domain line, in `TYPE.meta` | Where that line sits, and what shares its row |
| `LAYER_COLORS` | How the layer is expressed |

`CardShell` is now `SheetFrame` and is named for what it is: the Datasheet's frame, shared
with the error card. `CardHeader` takes an optional `band`, which the Datasheet passes and
a content-height style omits.

Three DESIGN rules are amended rather than reinterpreted:

- **Radius is per style.** Tiles has a 20-unit card and 12-unit tiles against DESIGN's
  "radius 2, one value, everywhere". The tiles the author reviewed and passed on a phone
  (`docs/spike/styles/`) were drawn at 12, and the periodic-table metaphor is a grid of
  chips rather than a nest of hard rectangles.
- **The bottom row carries the legend and the domain.** DESIGN's "the footer carries the
  domain and nothing else" was written for a card whose gutter named every layer. Tiles has
  no gutter and no y-axis, so the legend is the only thing that decodes the colour — it is
  load-bearing, not decoration, and it costs no height because it shares the row.
- **The card surface is per style.** Tiles paints on `#FFFFFF` light and `#12171C` dark,
  not on `surface`. This is not a preference: the layer tints were drawn against white,
  and on `#EDEEEA` the tooling tint sits three points from the card and vanishes, so the
  light card read flat while the dark one — where the same tint is fourteen points from
  its background — read as designed. The cost is that on GitHub's light README the card is
  white on white, held by its hairline alone; that is how the design was drawn, and the
  alternative was re-deciding eight tints the author has already reviewed on a phone.
- **Archivo appears more than once.** DESIGN gives it to the repo name alone. On Tiles it
  also sets the symbol (700) and the tile name (400); Commit Mono keeps the version, the
  owner and the domain.

The Tiles frame's border is 2 units of `rule`, which is below DESIGN's 3-unit floor for a
line that carries meaning. It carries none: the tiles are the structure and the border is
an edge. Nothing on this card encodes with line weight.

## Consequences

- **Every `stackHash` changes once**, so each repo costs one cold resolve the first time
  it is asked for after deploy. Cached docs written in the old shape fail
  `StackItemSchema` and degrade to a miss, which `lib/cache.ts` already does by design —
  this is the first time that path has been the plan rather than the safety net.
- **A symbol edit no longer needs a `RENDER_VERSION` bump.** The symbol is in the doc, so
  changing one changes that repo's `stackHash`, and every affected card lands on a new
  `png:` key by itself. Cards that do not contain the symbol keep their bytes and their
  key. This is strictly better than the freeze `docs/spike/styles/README.md` described,
  and it is the one genuine advantage B has over A that was not visible when the symbols
  were frozen.
- **`symbol` is now public API** on `/api/resolve`, alongside `display` and `description`.
- **Two frames to keep in step, and nothing enforces it.** The shared pieces are shared by
  construction, but nothing stops a third style from drifting on padding or header rhythm.
  The check is the eye, and `scripts/render-cards.ts <dir> <style>` is what serves it.
- **Storage holds.** Measured against the real renderer, a Tiles card is 443 units at one
  row and 208 more per row after that, and base64 for both themes lands within 2% of
  ADR-0029's estimate on the same repos. The three-row cap and the ~790-stack figure stand.
- **The error card keeps the Datasheet's frame whatever style was requested.** It is the
  same object with different content (ADR-0007), and a failing repo has no layers to tile.
  Tiles is the default and `card-*.png` is pinned to it, so this is the frame most failing
  embeds would show — **a launch blocker, recorded as one in ROADMAP**, not an open
  question. Phase 5 either gives `renderErrorCard` the style or states in ADR-0007 that
  the error card is deliberately one object whatever was asked for.

## What would make us revisit

- **A third style that wants the Datasheet's frame exactly.** Then the split is one frame
  too many and `SheetFrame` should take the differences as props instead.
- **The legend going unread.** It exists because colour is the only layer encoding; if the
  card turns out to read without it, the row is 29 units and a simpler bottom edge.
- **`StackItem` growing a second render-only field.** One is a field the site also needs;
  a second would mean the doc is becoming a render model, and the answer then is a separate
  view type rather than more fields on the cached document.
