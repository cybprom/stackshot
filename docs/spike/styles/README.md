# Phase 0 — de-risking the card styles

Four questions that could have invalidated a style, answered before building one. Images
here are throwaway renders from a scratchpad prototype, not the real renderer.

**Open this file in the GitHub mobile app.** That is the legibility check, on the surface
that governs: the app shows a README image at ~350px, which is 0.29 px per card unit.

---

## 1. Does Satori clamp text to two lines? Yes

Tiles names use `maxHeight` + `overflow: hidden` for a two-line clamp, which the design
handoff flagged as unverified. Satori honours both.

| | |
|---|---|
| ![clamped](./clamp-on.png) | ![not clamped](./clamp-off.png) |
| `maxHeight: 52, overflow: hidden` | no clamp |

Left: `coding-interview-university` cuts after two lines. Right, without it: the same name
takes three lines and the longest one **escapes the tile entirely**, painting over the
rounded corner. So the clamp is load-bearing, not decorative, and no code-side
measure-and-truncate is needed.

It clamps without an ellipsis, which is a difference from the repo name's behaviour
(GOTCHAS 039). It does not matter in practice: across all 225 map entries the longest
`display` is `styled-components` at 17 characters and the median is 6, so two lines is
never exceeded by real data. The clamp is a guard against a future entry, not a routine
behaviour. Phase 2's contact sheet renders all 225 and is the check.

## 2. Do Commit Mono's box-drawing glyphs exist? Yes, in both weights

Terminal draws its layer tree with `├── └──`. Parsed from the shipped `cmap` tables:

```
CommitMono-400-Regular.ttf   1175 codepoints
CommitMono-700-Regular.ttf   1175 codepoints
  U+2500 ─   U+2502 │   U+251C ├   U+2514 └   U+2588 █   U+25AE ▮      all present
```

Terminal is not blocked.

## 3. What do the designs' font weights cost? One new file

The four styles ask for Archivo 500/700 and Commit Mono 600; we shipped Archivo 400/600
and Commit Mono 400/700. Resolved by shipping **Archivo Bold** and remapping the rest.
See GOTCHAS 047.

`Archivo-Bold.ttf` is Omnibus-Type v2.001 — byte-checked as TrueType, `usWeightClass` 700,
**no `ltag` table** (GOTCHAS 015's trap), and the same version string as the Regular and
SemiBold already committed. Adding it left all 14 committed render hashes byte-identical,
because nothing asks for 700 yet, so no `RENDER_VERSION` bump.

## 4. How big is a Tiles card, and does it read at 0.29?

Content-height, so it varies with the stack. Measured at 1200 units wide:

| Repo | Height | PNG | base64, both themes |
|---|---|---|---|
| vercel/next.js | 1289 | 248 KB | 643 KB |
| mastodon/mastodon | 1289 | 253 KB | 658 KB |
| pmndrs/zustand | 659 | 142 KB | 368 KB |
| github/gitignore | 449 | 54 KB | 139 KB |

**Tiles costs about 1.7× Datasheet to store**: ~452 KB per stack against ~275 KB
(ARCHITECTURE). The 256 MB free tier holds roughly **550 stacks in Tiles alone**, against
~950 in Datasheet, and about **290** if a repo ends up cached in three style variants.
M4's byte-watching stops being a precaution.

**Tiles cards are portrait.** 1200×1289 for a dense repo, against Datasheet's 1200×800
landscape. In a README at 1100px wide that is a ~1180px-tall block. This is the biggest
unremarked consequence of the direction and it is a product decision, not a bug.

### Look at these on a phone

| | |
|---|---|
| ![next.js, light](./tiles-next.js-light.png) | ![next.js, dark](./tiles-next.js-dark.png) |
| ![zustand, light](./tiles-zustand-light.png) | ![zustand, dark](./tiles-zustand-dark.png) |

The question is only this: **at phone width, can you read the symbols?** The names are
23 units — 6.7px at 0.29, below the 8.75px floor DESIGN set for anything that must be
read — and that is deliberate. Symbols are 64 units (18.6px) and carry the card at
thumbnail size; names are for up close. The ADR records the reversal. If the symbols do
not survive this, the direction needs bigger tiles, not smaller type.

The symbols in these images come from a crude prototype generator and several are wrong —
`Jest → Js` reads as JavaScript, `Next.js → Nj` should be `Nx`. That is the argument for
Phase 2's review pass over all 225, not a reason to distrust the layout.

## Also found: Tiles misses five-across by four units

Five tiles need 1112 units; the design's padding leaves 1108, so it wraps to four columns
and the card grows a row. This is latent in the design file too, which misses it by 2px at
its 600px draw. Setting the card's padding to **32 — already `CARD.padding`, and on
DESIGN's spacing scale, where the design's 44 is not** — gives five across and cuts
next.js from 1523 to 1289 units and zustand from 893 to 659. All numbers above are at 32.
GOTCHAS 048.
