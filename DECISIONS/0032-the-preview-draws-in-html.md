# ADR-0032: The preview draws in HTML, and the site gets to move

**Status:** Accepted
**Date:** 2026-10-01
**Supersedes in part:** DESIGN.md MOTION (the closed list of three animations, and the ban
on animating layout or height), DESIGN.md SURFACE ("Radius: 2. One value, everywhere, card
and site")
**Builds on:** ADR-0029 (a style is built twice), ADR-0031 (what every style shares)

## Context

ADR-0029 settled that a style is built twice — a Satori tree for the PNG and an HTML
component for the site's preview — and gave the duplication two jobs: make drift between
the two implementations visible, and stop the style switcher writing a PNG per flip. It did
not say how either is achieved, and both are easy to get wrong in a way that looks fine.

Phase 4 also runs into two records that were written when the site had one card and three
animations.

- **MOTION** is a closed list: the card's arrival, the copy confirmation, the focus ring.
  It bans animating "layout, height, or position of anything other than item 1", and bans
  anything on initial page load. The approved preview
  (`docs/design/directions/preview.dc.html`) adds a dim, a sweeping scan line with a soft
  wake, a per-style reveal, a crossfade, and an eased height between card sizes.
- **SURFACE** fixes radius 2 everywhere, card and site, and bans `rounded-xl` by name. The
  two chosen page designs (`docs/design/site/a-playground.dc.html`,
  `c-gallery-wall.dc.html`) both use rounded controls: a segmented control at 10 outer and
  7 inner, fields and buttons at 8–10, the preview plate at 12–14, C's panel at 18.

## Options considered

**A — Port the design file's pixel values.** The `.dc.html` files are exact, and they are
the thing that was approved. They are also drawn at 600px, which is the card at half its
canvas, so every card value would be entered twice at two scales — one of them rounded.
GOTCHAS 048 and 051 are both the cost of trusting a doubled design number, and this would
be the third.

**B — Build the preview from the renderer's tokens, at the renderer's scale.** Draw each
preview at exactly 1200 CSS px with every token value used 1:1, then scale the whole tree
by one number. The card values exist once; the design file becomes the check rather than
the source. Costs a transform and a measurement, and makes the preview's internals read in
units nobody looking at the page can see.

**C — Render a PNG per flip and skip the HTML.** No second implementation, no drift, and
no cheap way to detect that the PNG is wrong either. Writes a render — and, on a cold
cache, a function invocation — for every press of the switcher, which is what ADR-0029
rejected.

## Decision

**B, and the preview is HTML first with the PNG settling in behind it.**

**1. One scale, one conversion.** Each HTML preview renders in a box exactly 1200px wide,
with token values used as CSS px at 1:1 — `padding: CARD.padding`,
`fontSize: TYPE.symbol.size`, `borderRadius: TILES.radius`. The tree is then
`transform: scale(w / 1200)` from its top-left corner, where `w` is the plate's measured
width. The same measurement gives the plate its height, so the eased height between card
sizes is a by-product of the scaling rather than a second measuring system.

**2. Nothing is written twice.** The previews read `COLORS`, `LAYER_COLORS`, `TILES`,
`TERMINAL`, `TYPE`, `CARD` and `displaySize` from `lib/tokens.ts`; the strings every style
says move to `lib/card-text.ts` (`DOMAIN`, `starsLabel`, `LAYER_NAME`); the Tiles preview
calls the renderer's own `layoutTiles`, so it shows the same fifteen cells. No hex and no
size literal in `app/preview/`, and a test enforces it.

**3. The PNG loads once the choice settles.** On a flip the HTML redraws immediately and
the PNG layer drops away; the real PNG is requested only after `PNG_SETTLE_MS` of no style
change, then crossfades in on `decode()`. Both themes of the chosen style are warmed, so
the theme toggle costs nothing afterwards. This is what "stops the switcher writing a PNG
per flip" has to mean in practice: loading each style's PNG on press would write one per
flip whatever the HTML does.

**Terminal's cursor belongs to the loading, not to the card.** The rows print, the cursor
blinks at the end while the PNG is still coming, and it fades out just before the fade
begins. So the settled card has no cursor, the crossfade compares like with like, and the
one element that would otherwise read as permanent drift becomes the thing that tells you
the sequence has finished — the cursor stopping *is* the done signal. Under reduced motion
there is no cursor at all, hidden in CSS rather than decided in script.

This is the general rule the preview follows wherever the two implementations could
differ: **anything the PNG does not have is part of arriving at the card, never part of
it.**

**The crossfade never runs during a reveal.** A PNG that decodes while tiles are still
popping in or rows still printing waits for the reveal to finish, and fades only then.
Decode time is a function of the network and the cache, so the overlap is arbitrary: a
warm card could land 200ms in and dissolve a card mid-animation, which reads as a glitch
rather than as a transition, and does it only for some visitors. The reveal is a fixed
duration we control, so holding the fade behind it is both bounded and the same every
time. The corollary is that `PNG_SETTLE_MS` is a floor on when the fade *starts*, never a
promise about when it happens.

**The eased height is a third gate, and only a card change eases it.** Two constraints, and
both of them are silent when broken — the card still arrives, it just arrives wrong.

The plate's height changes for three reasons and only two of them are the card: a style
flip, a new resolve, and a window resize. **A resize must land instantly.** The scale is a
function of the measured width, so an eased height would trail the pointer for the whole
duration as the window edge is dragged, which reads as the page struggling rather than as a
transition. So easing is decided at the measurement, not in CSS: the first measurement after
a card change carries the ease, everything the `ResizeObserver` reports afterwards does not,
and the class that holds the transition is committed in the same render as the height it
applies to. The height also has to actually move, which keeps out the first card — nothing
to grow from — and a Light/Dark flip, where both schemes lay out identically.

**And the fade waits for the frame to stop moving**, for the same reason it waits for the
reveal: dissolving one card into another while the frame is still opening shows them at a
size neither of them is. This is also what makes `onSettled` honest, since the page stops
saying "Drawing card" on it. The gate is held for every card change rather than only the
ones that move, because it is bounded under the reveal either way: in practice
`PNG_SETTLE_MS` already outlasts it, so it is a floor rather than a thing that binds.

`PLATE_HEIGHT_MS` is **400**, not the dim's 240: the dim does not travel and this does —
two styles of the same stack differ by hundreds of pixels, and a change that size reads as a
jump at 240. That buys two ceilings, both asserted in `tests/preview.test.ts`. It is under
the shortest reveal any card can have (520ms, Terminal with nothing to print), so it never
becomes what the crossfade is waiting for. And it is done before the last row of a dense
Tiles grid begins to reveal (570ms, cell 10), because the bottom row is the one the growth
is making space for and the frame clips what has not opened yet.

**4. The plate is GitHub's page colour**, `PREVIEW.page`, not our `surface`. A card is
rasterized on a transparent background, so its rounded corners show whatever is behind
them; previewing it on `surface` judges the corners against a colour no reader sees.

**5. MOTION's list grows, for the preview only.** Added: the dim with its sweep and wake,
the per-style reveal, the HTML-to-PNG crossfade, and the plate's height. The sweep keeps
its glow — "shadows: none" governs surfaces, cards and panels, not a transient motion
effect, and the glow is the loading moment the design asked to be lively. Everything else
in MOTION stands: no hover on a card, no scroll-triggered anything, the headline never
moves, and `prefers-reduced-motion` turns all of this off rather than damping it.

**6. The site's radius comes from the page designs.** Radius 2 is the **card's** rule, and
on the card it is untouched. On the site: segmented control 10 outer / 7 inner, fields and
buttons 10, the preview plate 12, the snippet block 12. The generator sits inside C's
rounded panel, and a radius-2 control inside an 18px panel reads as a mistake rather than
as a rule being kept.

## Consequences

- **The preview's source reads in card units, not page pixels.** A 64px font size in
  `app/preview/tiles-card.tsx` renders at about 59px on a 1100px plate and 19px on a
  phone. That is confusing for a reader who expects CSS and it is exactly what stops the
  two implementations diverging, so it gets a comment at the top of each preview rather
  than a softening.
- **A transform means the preview is not a layout.** Nothing outside the plate can size
  itself from the card, and text inside it is scaled rather than reflowed. Both are what
  we want — it is a picture of a card — but it does mean the preview cannot be made
  responsive in its own right, only smaller.
- **The drift surfaces are named, and they are spelling differences rather than shaping
  ones.** Satori's `lineClamp` needs `-webkit-line-clamp` in a browser; its
  `align-items: baseline` means a shared bottom edge where a browser means the first line
  (GOTCHAS 055); a line box written as a ratio can never agree, because Satori rounds it
  (GOTCHAS 052); and the font family in `TYPE` is Satori's registered name, so the preview
  maps it to the `next/font` variable. **Text shaping itself agrees to about 0.1%** once
  the same files are loaded — an earlier claim of 2.2% here was an instrument drawing in
  Helvetica (GOTCHAS 053). Where the two engines genuinely disagree, **the preview copies
  the renderer**, even where that means the preview's CSS reads oddly. The crossfade finds
  these, and `?draw=html` holds the HTML layer up with the PNG suppressed.
- **Two renders per generate instead of one**, warming both themes of the chosen style.
  Zero GitHub budget, by ADR-0029's split of the cache keys, and it buys an instant theme
  toggle. A style the visitor looks at and abandons inside `PNG_SETTLE_MS` costs nothing.
- **The site no longer looks like the card.** Rounded controls beside a radius-2 card is a
  deliberate separation of page from product, where before the page was an extension of
  it. If the page starts reading as a generic app shell, this is the first decision to
  re-examine.
- **DESIGN.md now needs the styles and the page.** It describes the Datasheet and a
  three-item motion list. Phase 5 owns that rewrite; until then this record is the site's
  motion and radius authority.

## What would make us revisit

- **The crossfade never catching anything.** If the two implementations agree for a whole
  milestone, the cheaper arrangement is to drop the HTML for the non-default styles and
  accept a render per flip on those.
- **A visible jump at the crossfade that is not drift** — a wrap point one character
  apart, say. The answer then is to stop crossfading and swap on decode, not to chase
  harfbuzz with CSS.
- **`PNG_SETTLE_MS` reading as sluggish.** If the card feels like it arrives late, the
  settle moves toward zero for the default style only, since that is the one most visitors
  never change.
- **A third page design, or neither A nor C winning.** The radius set above is taken from
  two files that agree on the controls; a layout that disagrees makes this a token the
  layout owns rather than one the generator does.
