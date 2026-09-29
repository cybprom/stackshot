# Card style directions — design handoff

Source of truth for the four card styles and the site preview's loading and reveal.
Exported from the design canvas; each `.dc.html` is plain HTML with inline styles, so
every value (colour, size, spacing, radius, timing) is exact.

## Reading the files

- **Scale.** Cards are drawn at 600px wide — their size in a README on desktop. The
  Satori canvas is 1200 wide, so **multiply every px value by 2** when porting to the
  renderer: font sizes, padding, gaps, radii, border widths, tile sizes.
- **Fonts.** Archivo is the real face. IBM Plex Mono is a stand-in for Commit Mono,
  which isn't on Google Fonts; use Commit Mono (400/700) in the renderer.
- **Data.** The `REPOS` and `THEMES` constants at the bottom of each file are the
  example stacks and the full token set, light and dark.
- **Layer colours** are new tokens (not in DESIGN.md yet): each layer has a colour and a
  tint, per theme. They live in `THEMES.*.layer` in every file.

## The four styles

| File | Style | Notes for porting |
|---|---|---|
| `tiles.dc.html` | Element tiles | Needs a two-letter `symbol` per map entry. Tile names use `max-height` + `overflow: hidden` for a two-line clamp — verify Satori honours it, or clamp in code. |
| `terminal.dc.html` | Terminal | Box-drawing glyphs (├── └──) must be covered by Commit Mono — check before relying on them. |
| `tags.dc.html` | Tags | Pills are flex rows inside a wrapping flex container, the same shape as the current item rows. |
| `datasheet.dc.html` | Datasheet, tuned | The current card with content-sized height and a colour marker per layer. |

## Site preview (`preview.dc.html`)

The interactive board: style switcher, Light / Dark / System toggle, and the loading
sequence. Everything here is **site-only HTML**, never part of the PNG:

- Two loading phases, both real: "Reading repo" while `/api/resolve` runs, "Drawing card"
  while the PNG loads.
- The old card dims (`opacity .28`, desaturated) with a sweeping line and soft wake.
- Each style has its own reveal: tiles pop in staggered, terminal rows print in order
  and end on a blinking cursor, tags pop in, datasheet rows slide in as their rules draw.
- Keyframes and timings are in the `<helmet><style>` block; per-item delays are computed
  in `renderVals()`.
- `prefers-reduced-motion` turns all of it off.
