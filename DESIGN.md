# DESIGN.md

The generated card is the product. The site is a delivery mechanism. Where the two compete
for attention or effort, the card wins.

This file describes what ships. It was rewritten at the end of Phase 5 (2026-11-11) to fold
in ADR-0029 to ADR-0039, which had been amending it piecemeal. The reasoning behind each
rule lives in `DECISIONS/` and the self-critique at the end. Where this file and the code
disagree, one of them is a bug: fix the code, or change this file and say why in the same
commit.

---

## GENRE

A component datasheet for a codebase: the density and authority of a reference document,
designed to be read at thumbnail size inside someone else's README by a developer who is
scrolling, not studying.

Three card styles say the same facts in that genre. **Tiles** is the default and reads as a
periodic table of the stack. **Terminal** reads as the output of a command. The
**Datasheet** is the original spec-sheet card. It is still served at `sheet-*.png` and is
not offered on the site.

---

## REFERENCES

Eight, all real, all specific about what to take. They shaped the Datasheet, and the type,
colour and copy rules every style inherits.

1. **Teenage Engineering product panels** (OP-1, TX-6). Every zone is labelled like a
   control surface. Take: the confidence to label structure explicitly.
2. **Texas Instruments / Analog Devices datasheet pin-out pages.** Take the tolerance for
   density, and the idea that position carries meaning.
3. **FDA nutrition facts panel.** Hierarchy from rule weight alone. The source of the
   Datasheet's layer separators.
4. **Architectural drawing title blocks.** The small metadata block as an authority
   signal. Take: the footer treatment.
5. **Panic** (Playdate packaging, Nova release notes). Flat confident colour and precision
   without stiffness. Take: proof that technical can be warm.
6. **Shields.io badges.** Why a 20px image became universal, and the failure mode of
   fifteen stacked. Take: the reason we are one card and not a row of chips.
7. **Klim Type Foundry specimen pages.** A name plus its metadata across very different
   sizes. Take: the repo-name treatment.
8. **Fly.io and Railway docs diagrams.** Layered drawings where the y-axis is semantic.

Tiles adds one: **the periodic table**, a grid of chips where a two-letter symbol stands for
a thing and colour names its group (ADR-0029, ADR-0030).

---

## TYPE

Two faces, both SIL OFL 1.1, both shipped as TTF from `public/fonts/` and read at module
scope (invariant I7). **Satori cannot load WOFF2**, and the Commit Mono OTFs carry an `ltag`
table Satori cannot parse (GOTCHAS 015).

### Commit Mono

Everything structural: owner, versions, the domain, Terminal's whole card, the error card's
text, and data on the site.

- **Ships 400 and 700 only, and every scale is built on that.** There is no 500 or 600. Do
  not "restore" them (GOTCHAS 014, 045).
- Why: a monospace reads as machine-generated on purpose, which is the genre, and versions
  and names align into columns for free.
- Site fallback: `"Commit Mono", ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace`.

### Archivo

The repo name on every style, and on Tiles the symbol and tile name too (ADR-0030). On the
site, headings, prose and controls.

- Card weights: 400, 600, 700. The site adds 800 for section headings and the panel title.
  No card step asks for 800, and `lib/render/fonts.ts` does not load it.
- Static files only, never the variable font.
- Site fallback: `Archivo, "Helvetica Neue", Arial, sans-serif`.

**Rejected:** Inter, Space Grotesk, Bricolage Grotesque, JetBrains Mono. Instrument Sans is
the fallback if Archivo ever reads too neutral. No third face.

### Display ratios

Every card size is in the card's 1200-unit space. The card renders at 2×. **Measured, not
estimated**:

| Surface | Card width | px per unit |
|---|---|---|
| Desktop README | ~1100px | 0.92 |
| GitHub mobile web | ~380px | 0.32 |
| GitHub iOS / Android app | ~350px | 0.29 |

**The app column governs.** Anything that must be read has to survive 0.29, which puts the
practical floor at `card/item`'s 30 units, 8.75px in the apps (GOTCHAS 022).

### Card scale

`TYPE` in `lib/tokens.ts` is the source. **A line height the HTML preview has to match is
written in px**, because Satori rounds every line box to a whole unit and a browser does
not (GOTCHAS 052).

Shared by every style:

| Step | Use | Size | Face | Line height | Tracking |
|---|---|---|---|---|---|
| `card/display` | Repo name | 64, laddered | Archivo 600 | 1.00 | -0.02em |
| `card/owner` | Owner, above the name | 24 | Mono 400 | 26px | 0 |
| `card/meta` | The domain line | 16 | Mono 400 | 18px | 0.04em |
| `card/error-detail` | The error card's second line | 22 | Mono 400 | 28px | 0 |

`card/owner` and `card/meta` are 26 and 18. This table used to say 1.20, but the card has
always rendered these values. The table was wrong, so no `RENDER_VERSION` bump was needed.

Tiles:

| Step | Use | Size | Face | Line height | Tracking |
|---|---|---|---|---|---|
| `card/symbol` | Two-letter symbol | 64 | Archivo 700 | 1.00 | -0.03em |
| `card/tile-name` | Name under the symbol | 23 | Archivo 400 | 26px | 0 |
| `card/version` | Version, top right of a tile | 22 | Mono 400 | 1.10 | 0 |
| `card/legend` | Layer names in the bottom row | 24 | Archivo 400 | 29px | 0 |

`card/tile-name` is 6.7px in the apps, below the floor, on purpose. The symbol carries the
card at thumbnail size, and the name is for up close (ADR-0029). The symbol is 700 because
600 reads visibly light at 64 (GOTCHAS 047).

Terminal:

| Step | Use | Size | Face | Line height |
|---|---|---|---|---|
| `card/prompt` | `$ stackshot owner/repo` | 24 | Mono 400 | 29px |
| `card/terminal-name` | Repo name | 36 | Mono 700 | 43px |
| `card/tree` | Layer rows and items | 30 | Mono 400 | 42px |

`card/tree` is `card/item`'s size because Terminal has no symbols: its item names are the
whole card, so the floor applies to them (GOTCHAS 048).

Datasheet:

| Step | Use | Size | Face | Line height | Tracking |
|---|---|---|---|---|---|
| `card/item` | Package name | 30 | Mono 400 | 1.10 | -0.01em |
| `card/version` | Version, after the name | 22 | Mono 400 | 1.10 | 0 |
| `card/overflow` | `+7 more` | 22 | Mono 400 | 1.10 | 0.02em |
| `card/gutter` | Rotated layer label | 18 | Mono 700 | 1.00 | 0.18em |

`card/gutter` also sets the reason label on every error card (ADR-0033). Tracking tightens
as size grows, and that relationship is the rule.

**Name and version are the same weight** on every style, so the distinction rests on `ink`
against `ink-muted`. Contrast survives downscaling where stroke does not.

### Long repo names

GitHub allows 100 characters. Every style bounds the name (ADR-0031), each in its own way:

- **Tiles and the Datasheet** step `card/display` down to 48 past ~22 characters, 40 past
  ~30 and 36 past ~48. The counts are a proxy for width, so check rendered output. The
  name may wrap to two lines and needs `wordBreak`, because a name with no hyphens has no
  break opportunity. Past two lines it truncates with an ellipsis. Only a name crafted to
  be wide reaches that, and the site shows the full name beside the card (GOTCHAS 039).
- **Terminal** never resizes, because a terminal does not resize its own output. The name
  sits at a fixed 36, clamped to two lines, under a prompt clamped to one. The ellipsis
  reads as a shell truncating a path rather than as damage.

### Site scale

Utilities in `app/globals.css`, all in px:

| Utility | Use | Size | Face | Line height |
|---|---|---|---|---|
| `site-panel-title` | The hero headline | 40, 58 from 640px | Archivo 800 | 1.02, then 1.00 |
| `site-section` | Section headings | 38 | Archivo 800 | 1.05 |
| `site-body` | Prose | 17 | Archivo 400 | 1.55 |
| `site-small` | Secondary prose, notes, footer | 15 | Archivo 400 | 1.45 |
| `site-name` | A technology's name in a list | 16 | Archivo 600 | 1.35 |
| `site-control` | Buttons, labels, segments | 14 | Archivo 600 | 1.20 |
| `site-data` | The repo field, the search field | 15 | Mono 400 | 1.45 |
| `site-status` | Repo names, counts, the status line | 13 | Mono 400 | 1.30 |
| `site-chip` | Try chips | 13 | Mono 400 | 1.40 |
| `site-code` | The snippet | 14 | Mono 400 | 1.50 |
| `site-label` | Generate, which scrambles | 14 | Mono 400 | 1.20 |

**Generate is the one mono control.** Its label resolves character by character, and a
proportional face jitters on every frame (ADR-0038).

`site-display` and `site-title` are defined but unused since the Phase 5 page. Delete them,
or use them, rather than letting a third heading step creep in. Prose is capped at 68
characters per line.

---

## COLOR

### The palette

Five tokens per theme, a cool green-blue cast throughout. None are Tailwind's gray, slate
or zinc.

| Token | Light | Dark | Role |
|---|---|---|---|
| `surface` | `#EDEEEA` | `#0E1113` | The site's page. The Datasheet's card. |
| `ink` | `#101615` | `#DDE2DD` | Primary text. Every line that carries meaning. |
| `ink-muted` | `#5A625E` | `#8B9490` | Versions, owner, metadata. |
| `rule` | `#C8CCC4` | `#242A2B` | Decorative hairlines only. See the warning below. |
| `accent` | `#C8461E` | `#FF6B3D` | One hue, two values. Uses below. |

**The accent is one hue expressed twice**, because no single hex clears AA on both
backgrounds.

**Where accent appears, and nowhere else:**
- On a card: the Datasheet's 4-unit top bar, and Terminal's `$` (ADR-0031). Tiles has none.
- On the site: the focus ring, a focused field's border, the status square above the
  previewed card, and the loading sweep, which uses the previewed card's own accent
  (ADR-0039). Never a button fill.

**`rule` fails 3:1 against `surface`, so it is decorative only.** Every line that encodes
information uses `ink` at 3 units or more. The Tiles and Terminal frames use 2 units of
`rule` because they encode nothing: the tiles and the tree are the structure, and the
border is only an edge (ADR-0030).

### Layer colours

One colour and one tint per layer per theme, shared by every style, in `LAYER_COLORS`. They
reversed the original "colour carries no meaning" rule once the layout stopped being four
stacked bands: Tiles has no y-axis, so colour is the only thing encoding the layer
(ADR-0029).

| Layer | Light colour / tint | Dark colour / tint |
|---|---|---|
| Frontend | `#2458C4` / `#E4ECFA` | `#7FAEFF` / `#14223A` |
| Backend | `#1B7F52` / `#E0F1E7` | `#5CC896` / `#10291D` |
| Infra | `#9A5F0E` / `#F5EAD6` | `#E5AE58` / `#2A2111` |
| Tooling | `#596068` / `#EAECED` | `#A8AEB5` / `#1C2126` |

The Datasheet does not use them. It still encodes layers with rule weight and position.

### Card surfaces

Each style paints its own card (ADR-0030):

| Style | Light | Dark | Why |
|---|---|---|---|
| Tiles | `#FFFFFF` | `#12171C` | The tints were drawn against white. On `surface`, the tooling tint vanishes. |
| Terminal | `#FAFAF7` | `#0A0D10` | A terminal sits slightly off the page. |
| Datasheet | `surface` | `surface` | |

### Site-only colours

Not part of the palette, never on a card, and kept out of `lib/tokens.ts` except where the
preview needs them:

| Token | Light | Dark | Use |
|---|---|---|---|
| `error` | `#9B2C10` | `#F08055` | The failure message |
| `success` | `#2F5E3F` | `#79B18D` | The status square once a card is drawn |
| `field` | `#FFFFFF` | `#14191C` | Inputs and light-filled controls |
| `preview-page`, `-rule`, `-ink-muted` | GitHub's light README | GitHub's dark README | The plate behind a previewed card (`PREVIEW`) |
| `code-*` | dark in both | dark in both | The snippet block, which reads as a terminal |

**The card has no semantic colours at all.** The error card uses the normal palette. A red
card in a README would be alarming and wrong.

**Two bands are pinned rather than following the reader.** The hero and the nav are always
dark (`.theme-dark`), a room for the wall. The panel is always light (`.theme-light`), so it
stays the lit object in both schemes. Inside the panel, the previewed card still follows
the reader or the theme toggle (ADR-0037, GOTCHAS 056). `tests/tokens.test.ts` keeps the
repeated values from drifting.

---

## SPACING

One scale, 4-unit base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (`SPACE`).

Nothing off-scale ships, including inline styles in the Satori trees. If a step is wrong,
change the step. Card outer padding is 32 on every style.

The exceptions are dimensions, not spacing, and each is commented in `lib/tokens.ts`:
- The Datasheet's gutter is 72, derived from the rotated label's cap height.
- Tiles' tiles are 208 × 192. **Five across is load-bearing**: 5 × 208 + 4 × 16 = 1104
  against 1132 units of content width (GOTCHAS 048).
- Terminal's label column is 240, which holds `├── frontend` on one line.

On the site, every section shares one column, `.site-grid`: `min(1220px, 100% - 40px)`,
centred. The hero panel is the only thing wider than its own content, and it is 1220 too.

---

## SURFACE

### On the card

| | Tiles | Terminal | Datasheet |
|---|---|---|---|
| Card radius | 20 | 16 | 2 |
| Border | 2u `rule` | 2u `rule` | 3u `ink` |
| Accent | none | the `$` | 4u top bar |
| Height | content | content | 800 fixed |
| Inner shapes | 12u tiles with a 6u top bar | none | rules, never boxes |

**Shadows: none, on every card.** A card in a README sits flat in the page, and Satori's
shadow support is partial. The tile's top bar is mitred at the corners, and the HTML
preview draws it with transparent side borders to match (GOTCHAS 065).

### On the site

The site is rounded, and its radii are a set, not a scale (ADR-0032):

| Token | Value | Use |
|---|---|---|
| `radius-tile` | 6 | Tiles on the page, chips |
| `radius-segment-item` | 7 | A segment's sliding fill |
| `radius-control` / `radius-segment` | 10 | Buttons, inputs, segmented controls |
| `radius-plate` / `radius-snippet` | 12 | The card's plate, the snippet block |
| `radius-panel` | 16 | The hero panel |

No Tailwind default radius ships.

**One shadow on the whole site:** the hero panel's, because it is the only element genuinely
in front of something. Everything else is flat, and the sweep's glow is motion, not
surface.

---

## MOTION

The card is a static image and never animates. Everything here is the site's.

### Tokens

| Token | Value | For |
|---|---|---|
| `motion/state` | 120ms | Colour, border and press changes |
| `motion/arrival` | 200ms | Fades: the dim, the crossfade, Copy's label |
| `motion/travel` | 400ms | Height that moves: the plate, the snippet disclosure |
| `motion/open` | 520ms | The panel's one opening (`PANEL_OPEN_MS`) |
| `ease/standard` | `cubic-bezier(0.2, 0, 0, 1)` | Everything, except the sweep's own symmetric loop |

Delays and per-item timings live in `lib/preview.ts`, `lib/hero.ts` and `lib/scramble.ts`.
Durations that are the same for every item live in CSS.

### What animates, a closed list

1. **Controls.** State colours at 120ms, a 0.97 press scale, the segment fill sliding
   between measured positions, the chevron, Copy's label swapping in place.
2. **The panel's opening**, once, on the first Generate. Width and height move together on
   one curve over 520ms. The copy crossfades from its closed wrap to its open wrap, so no
   text re-breaks in motion. The card column fades in from 16px to the right. The caption
   below the panel is counter-moved, so it never travels.
3. **The loading sequence on the plate** (ADR-0032):
   - Reading: the card on screen dims to 0.28 and desaturates over 200ms while the sweep
     crosses it on a 900ms loop. The sweep fades out in 120ms the moment loading ends,
     wherever it is.
   - Drawing: Tiles pops in at 45ms per tile over 460ms. Terminal prints a row every
     150ms over 320ms, with a cursor blinking at 1060ms until the PNG is ready.
   - Settling: the real PNG crossfades in over 200ms, but only after it has decoded, the
     reveal has finished, and the plate's height has settled. The cursor fades out first.
     Nothing the PNG lacks may remain once it is up.
   - The plate's height eases over 400ms on a card change, never on a resize.
4. **The status line and Generate's label scramble** to their new text, left to right, at
   28ms a step (ADR-0038).
5. **The wall**, the one scroll-linked element. Each column drifts at its own rate as the
   page scrolls, and the wall dims while the repo field has focus. The nav turns solid
   over the first 120px of scroll. With no scroll timelines, the wall is still and the nav
   is solid (ADR-0039).
6. **The tech index.** Old tiles fade out together in 120ms, which is also the typing
   debounce, and new tiles arrive on the same tile-in at a faster stagger.
7. **The snippet disclosure**, grid rows over 400ms with the code fading in behind.

### What must not animate

- **Anything on page load.** The page arrives complete. The panel has no entrance.
- **Any hover state on a card** or its contents.
- **The headline**, except the crossfade that hides its re-wrap during the opening.
- **Anything scroll-linked** other than the wall and the nav.
- **Idle decoration.** Nothing loops unless it is reporting work in progress.

### Reduced motion

A real branch, never a global `animation: none`. The panel opens instantly, already in its
final layout. There is no wall drift, no sweep and no cursor. The reveal is skipped. The
dim and the crossfade become instant. Labels change without scrambling. Controls keep their
colour change and drop the press scale.

---

## SIGNATURE

Each style has one element that identifies it at 300px wide, when no package name is
legible.

**Tiles: the symbols.** Fifteen two-letter symbols in their layer's colour, on its tint,
under a layer-coloured top bar. Symbols come from the map entry (`symbol` on `StackItem`),
are proposed by `scripts/symbols.ts`, and are checked by reading `scripts/symbol-sheet.ts`'s
output as a stranger would.

**Terminal: the prompt and the tree.** `$ stackshot owner/repo` in accent and ink, then
`├──` and `└──` branches with the layer name bold in its colour.

**Datasheet: the gutter.** A left gutter running the full height of the card, carrying the
layer names rotated 90°, reading bottom to top, in tracked-out mono. It is verified at
Milestone 0 (`docs/spike/gutter-comparison.png`). The shape is not obvious, so it is
pinned: an absolutely positioned wrapper fills the band and centres its child, the label
rotates about its own centre, and it needs `whiteSpace: nowrap` and `flexShrink: 0` or it
wraps before rotating (GOTCHAS 004). **FRONTEND is 110 units rotated**, so no band may drop
below ~110 or the failure looks like a rotation bug.

Everything else stays quiet on every style: no logos, no icons, no texture (ADR-0002).

---

## CARD ANATOMY

All cards are 1200 units wide. What every style shares is fixed by ADR-0031: the facts
(owner, repo, language, stars), the domain line, the layer colours, the width, and a
bounded name. Everything below the facts belongs to the style. At most four layers, always
in the order frontend, backend, infra, tooling. An empty layer is omitted entirely.

### Tiles (the default)

```
╭──────────────────────────────────────────────────────────────────╮  2u rule, r20
│  vercel/                                             TypeScript  │
│  next.js                                             138k stars  │  header
│                                                                  │  32
│  ┌▀▀▀▀▀▀▀▀▀┐ ┌▀▀▀▀▀▀▀▀▀┐ ┌▀▀▀▀▀▀▀▀▀┐ ┌▀▀▀▀▀▀▀▀▀┐ ┌▀▀▀▀▀▀▀▀▀┐     │
│  │      19 │ │      15 │ │       4 │ │         │ │       3 │     │  208 × 192 tiles
│  │ Re      │ │ Nj      │ │ Tw      │ │ Sw      │ │ Zo      │     │  5 across, gap 16
│  │ React   │ │ Next.js │ │ Tailwind│ │ SWR     │ │ Zod     │     │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
│  … up to three rows, fifteen cells …            ┌ ─ ─ ─ ─ ┐      │  +N more: dashed
│                                                 │  +6 more │      │
│                                                 └ ─ ─ ─ ─ ┘      │
│  ■ Frontend  ■ Backend  ■ Infra  ■ Tooling     stackshot.ilerio… │  legend + domain
╰──────────────────────────────────────────────────────────────────╯
```

- **Fifteen cells, five by three, at content height.** `layoutTiles` allocates them: every
  layer present keeps at least one item tile, then cells go to the layers with the most to
  say, by largest remainder. A `+N more` tile costs a cell like any other.
- **A tile** is the version top right in `ink-muted`, the symbol in the layer colour, and
  the name at the foot, clamped to two lines by a 52-unit max height.
- **The bottom row carries the legend and the domain** (ADR-0030). The legend is
  load-bearing, because it is the only thing decoding the colour.
- No accent bar and no rule under the header.

### Terminal

```
╭──────────────────────────────────────────────────────────────────╮  2u rule, r16
│  $ stackshot vercel/next.js                                      │  prompt, 1 line
│  vercel/next.js                         TypeScript   138k stars  │  name 36, ≤2 lines
│                                                                  │
│  ├── frontend   React 19   Next.js 15   Tailwind 4   SWR 2       │  rows, 24 apart
│  ├── backend    Node 22   Prisma 6                               │
│  ├── infra      Docker   GitHub Actions   Vercel                 │
│  └── tooling    pnpm   Turborepo   TypeScript   +4 more          │
│                                                                  │
│  stackshot.ilerioluwa.com                                        │
╰──────────────────────────────────────────────────────────────────╯
```

- **Rows are 24 apart**, because the box glyphs are taller than their line box and 12 left
  the stems reading as one broken line (GOTCHAS 051). Items wrap within their row.
- The label column is a fixed 240, so item columns line up down the card.
- The name is the full `owner/repo`, with language and stars in `ink-muted` on its right.

### Datasheet

1200 × 800 units, fixed.

```
┌════════════════════════════════════════════════════════════════┐  4u accent bar
│  ┌──────┬──────────────────────────────────────────────────┐   │
│  │      │  vercel/                              TypeScript │   │  header band
│  │      │  next.js                             138k stars  │   │  140u
│  │      ├══════════════════════════════════════════════════┤   │  8u ink rule
│  │ F  ↑ │  Next.js 15    React 19    Tailwind 4            │   │  layer band, min 120u
│  │ R    ├──────────────────────────────────────────────────┤   │  5u ink rule
│  │ B  ↑ │  Node 22    PostgreSQL 16    Prisma 6            │   │
│  │      ├──────────────────────────────────────────────────┤   │  3u ink rule
│  │ I  ↑ │  Docker    GitHub Actions    Vercel              │   │
│  │      ├──────────────────────────────────────────────────┤   │  3u ink rule
│  │ T  ↑ │  pnpm    Vitest    ESLint    +4 more             │   │
│  └──────┴──────────────────────────────────────────────────┘   │
│  stackshot.ilerioluwa.com                                      │  footer 56u
└────────────────────────────────────────────────────────────────┘  3u ink border, r2
```

- **Separator weight decreases downward: 8 · 5 · 3 · 3.** Hierarchy from weight, not colour.
- **Band minimum height is 120**, for two reasons at once: two wrapped lines of
  `card/item`, and the 110-unit rotated FRONTEND. A change to it must satisfy both.
- At most six items per layer, then `+N more`. No scroll, no shrink-to-fit.
- The footer carries the domain and nothing else.

### On every style

- **Items are the name plus a version, major only by default**: `Next.js 15`, never
  `^15.1.0` (ADR-0008, refined by ADR-0017 to ADR-0020).
- **No descriptions on the card.** They live on the site, under "What Stackshot found"
  (ADR-0009).
- **No date.** It said when Stackshot first saw the stack, not when the repo changed, so it
  was wrong on the day it was drawn (ADR-0025).

### The error card

Every style frames its own error card, because Tiles is the default and `card-*.png` is
pinned to it (ADR-0033). The content is one object in every frame: the header naming the
repo, a reason label in `card/gutter`, the reason sentence, and a detail line in
`card/error-detail`. Five reasons, from `ERROR_COPY`, which the site shares:

| Reason | Label |
|---|---|
| `not_found` | NOT FOUND |
| `no_manifests` | NO MANIFESTS |
| `nothing_mapped` | NOTHING MAPPED |
| `rate_limited` | RATE LIMITED |
| `unavailable` | UNAVAILABLE |

- **Tiles and Terminal draw theirs at content height**, the label flat under the header.
- **The Datasheet's is 1200 × 518**, derived as `ERROR_CARD_HEIGHT`, with the label rotated
  into a 240-unit band sized by NOTHING MAPPED's 191 rotated units.
- **One URL serves several heights**: a resolving repo's card and its error card. The
  snippet never pins `width` or `height` on the `img`, or a card copied while the repo
  worked would distort once it fails.
- The card route returns the error card as a 200 image, never a non-200 (invariant I5).

---

## THE SITE

One page, top to bottom (ADR-0039 supersedes ADR-0037's two layouts):

1. **Nav.** The wordmark at the left. At the right, a GitHub link joined to the live star
   count. It is see-through over the wall and turns solid as the page scrolls.
2. **The hero band.** A dark room. Behind, the **wall**: six columns of the homepage's 16
   repos as dark Tiles and Terminal cards in HTML, each repo exactly three times, at 0.40
   opacity and 0.18 while the field has focus. In front, the **panel**, pinned light and
   top-anchored.
   - **Closed** (660 wide): the headline, the intro, the repo field with a fixed
     `github.com/` prefix, Generate, and three Try chips. Clicking anywhere in the field
     focuses the input.
   - **Open** (1220 wide), from the first Generate on, and never closed again: the form at
     440 on the left with the style and theme controls under a rule. On the right, the
     status line, the **plate**, and the actions.
   - Below 1280px wide the columns stack and nothing travels sideways.
   - Under the panel, once it is open, a caption names the wall: "Behind the panel: real
     repos, drawn by Stackshot", and five of the repos.
3. **The plate.** A GitHub README frame: a `README.md` bar over GitHub's page colour, with
   the card drawn on it in HTML at the card's own 1200-unit scale, then the real PNG
   crossfaded over it (ADR-0032). The status line above it reads "Reading owner/repo",
   then "Drawing owner/repo", then "N found in owner/repo", with "drawn in Xs" at its
   right on wider screens.
4. **The actions**, invisible until a real card exists so the panel keeps its height:
   Copy markdown, Light PNG and Dark PNG downloads, and a "Show snippet" disclosure that
   opens by itself if the clipboard refuses.
5. **The snippet pitch.** Why a `<picture>` element, the snippet, and the intro card as a
   build-rendered light and dark pair, which never touches the card route.
6. **What Stackshot found**, once a card exists. A definition list in the card's order,
   one row per item: symbol, name, version, description. It is the key to the card above.
7. **Does it know your stack?** The tech index: every map entry as a tile, searchable and
   filterable by layer, two rows until "Show all". A miss names the closest entry and links
   to "Suggest a technology", underlined because it sits inside prose.
8. **Footer.** Open source, the author, the suggest link.

### How the slot behaves

The plate is one slot whose contents are swapped, so the page does not move when it
answers you.

- **Before the first card**, the slot is blank, sized by the hidden intro image, and sweeps
  while the first repo is read. It never shows another repo's card while yours loads.
- **A new card** dims the old one in place, sweeps, reveals, then settles to the PNG.
- **A failure that names a repo** replaces the card with that repo's real error card, which
  is what its README would show, and clears Copy, the downloads and "What Stackshot found".
- **A typo, or the per-IP hourly limit**, names no repo. The message appears under the
  field and the current card stays.
- **The PNG** is requested only once a style choice has settled, and both themes are warmed
  at once.

---

## QUALITY FLOOR

Build to this without announcing it.

- **Mobile.** The site works at 360px. The card's real test is GitHub's mobile web view and
  the iOS and Android apps.
- **Visible keyboard focus.** A 2px accent outline at a 2px offset on everything focusable.
  Fields draw focus on their own border instead. Never `outline: none` without a
  replacement in the same rule.
- **WCAG AA.** Every text pair meets 4.5:1. Check with a tool rather than trusting a table.
  `rule` is excluded because it carries no information.
- **Hit areas.** At least 40px, including Try chips that draw at 26px.
- **Error states.** One per reason, each naming the repo and the reason, from the same
  `ERROR_COPY` the card uses. A sixth, a URL naming no repo, is answered in the page before
  a request is spent.
- **The error card.** Full palette, naming the repo and the reason, so a README never shows
  a broken image.
- **Loading.** Labelled, never a spinner. The button says what is happening, the status
  line names the repo, and a screen reader hears it through a live region. Scrambled text
  is always `aria-hidden`, with the real words beside it.
- **Two downloads are two links**, because browsers block or prompt on two downloads from
  one click. Their URLs are path-only, so `download` always saves rather than navigates
  (GOTCHAS 068).

---

## UI COPY RULES

- **Active voice.** "Stackshot couldn't find this repo", not "This repo could not be found".
- **Sentence case everywhere on the site.** The card's reason and gutter labels are the
  only all-caps in the project, and they are signage, not headings.
- **Buttons are named for what happens.** "Generate card", "Copy markdown", "Light PNG".
  Never "Submit", "Go", "Click here", or a bare arrow.
- **The same verb runs through a whole flow.** "Copy markdown" confirms as "Markdown
  copied". "Reading repo" on the button is "Reading owner/repo" on the status line.
- **Errors say what broke and how to fix it**, never "Something went wrong". They do not
  apologise and do not use exclamation marks.
- **Empty states invite an action.**
- **No filler.** No "simply", "just", "powerful", "seamless", "beautiful". No em-dash
  asides in interface copy.
- **No trailing arrows on links or buttons.**
- **"Stack" means the detected technologies**, and nothing else.

Every string the site shows lives in `lib/site.ts`, and the card's in `lib/card-text.ts`
and `ERROR_COPY`.

---

## SELF-CRITIQUE

For each decision: would I have produced this for a completely different brief? Where the
answer was yes, it was a default and was changed. This is the record, kept because the
writeup draws on it. Where a later decision overturned one, it says so.

### The card, Milestone 0

**1. Canvas 1200 × 630, then 750, then 800.** 1.91:1 is the OpenGraph ratio every image
tool reaches for, and it has nothing to do with a four-band diagram. 750 then failed when
every meaningful line rose to the 3-unit floor (GOTCHAS 012). Tiles and Terminal later went
to content height, which ends the question for them.

**2. Layers were colour-coded. Changed to rule weight.** Four colours for four categories is
what every diagram tool does. **Overturned for Tiles and Terminal by ADR-0029**, on a narrow
argument: once the layout stops being stacked bands, position stops carrying the layer, and
colour becomes the only encoding. The Datasheet still encodes with weight.

**3. Radius 8, changed to 2.** Pure reflex. **Overturned per style by ADR-0030**: Tiles is a
grid of chips, and hard rectangles fought the metaphor. The Datasheet keeps 2.

**4. A third face for the repo name, cut to two.** A face bought for one string is
decoration, not a system. Still holds.

**5. The page was going to open with a centred input in a viewport-height void.** Changed to
lead with a real card. **Since overturned in form, kept in spirit**: the Phase 5 hero is a
wall of real cards behind the input, so the first second still shows the product rather
than describing it.

### The site, Milestone 3

**1. The primary button was going to be `accent`.** Changed to `ink`, because a coloured
call to action is the most automatic decision on any page. Still holds. Accent has since
gained three quiet site uses (ADR-0039), none of them a fill.

**2. Loading was going to be a spinner.** Changed to a labelled state and a live region.
Still holds, and grew a status line and a sweep.

**3. The failure was going to be a toast.** Changed to text under the field, which persists.
Still holds. The example card no longer stays behind it: a failing repo shows its own
error card (ADR-0039).

**4. The empty state was going to be a separate section.** Changed to the same slot the
result uses. Still holds.

**5. The description list was going to be a grid of cards.** Changed to a definition list in
the card's order. Still holds.

**The headline** was the element most at risk. "Show your stack where people already look"
was marketing rather than naming. It was replaced in Phase 5 by "What's it built with?",
which is the question the product answers.

### Two defaults kept on purpose

**All-caps labels** and **a mono face for small data** are usually tells of generated work.

- The card's all-caps labels are signage beside the thing they name, not eyebrows above a
  heading. **On the site there are no all-caps labels at all.**
- Mono carries the whole Datasheet and Terminal, and the sans is the accent, which inverts
  the usual tell. The brief pins the genre to a spec sheet, and the brief wins.

### Still at risk

**Density on GitHub's mobile apps.** Tiles answers it with symbols that survive 0.29, and
Terminal with names held at the 30-unit floor. If a real phone shows either failing, the fix
is structural (fewer cells, larger type), not cosmetic.
