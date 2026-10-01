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

Content-height, so it varies with the stack — and **capped at three rows**, which is what
keeps it from becoming a portrait block taller than the screen reading it. Measured at
1200 units wide, after the cap:

| Repo | Rows | Height | PNG | base64, both themes |
|---|---|---|---|---|
| vercel/next.js | 3 | 869 | 191 KB | 495 KB |
| mastodon/mastodon | 3 | 869 | 186 KB | 482 KB |
| pmndrs/zustand | 2 | 659 | 142 KB | 368 KB |
| jwasham/coding-interview-university | 1 | 449 | 67 KB | 174 KB |
| github/gitignore | 1 | 449 | 54 KB | 139 KB |

The cap took next.js and mastodon from 1289 units to **869**, near the Datasheet's fixed
800, and the average from ~452 KB per stack to **~332 KB** against the Datasheet's ~275 KB.
The 256 MB tier holds roughly **790 stacks** in Tiles alone. With the `png:` TTL at 7 days
and Upstash eviction on, the cache degrades under pressure rather than stopping.

### The phone check: passed

**Read in the GitHub mobile app on 2026-09-29.** The symbols were legible — in this table,
where the two themes sit side by side and each image is therefore *smaller* than a README
would render it. That is the verdict the direction needed, from the surface that governs.

| light | dark |
|---|---|
| ![next.js, light](./tiles-next.js-light.png) | ![next.js, dark](./tiles-next.js-dark.png) |
| ![zustand, light](./tiles-zustand-light.png) | ![zustand, dark](./tiles-zustand-dark.png) |
| ![sparse, light](./tiles-sparse-light.png) | ![sparse, dark](./tiles-sparse-dark.png) |

The names are 23 units — 6.7px at 0.29, below the 8.75px floor DESIGN set for anything
that must be read — and that is deliberate. Symbols are 64 units (18.6px) and carry the
card at thumbnail size; names are for up close. ADR-0029 records the reversal.

The last row is the sparsest shape the layout has to hold: one tile, no language, a
26-character name. It reads as a spec sheet with one entry rather than as a broken card.

The symbols in these images come from a crude prototype generator and several are wrong —
`Jest → Js` reads as JavaScript. That was the argument for Phase 2's review pass over all
225, not a reason to distrust the layout. **The review settled them**: `Next.js` is `Nj`,
decided there and frozen, and an earlier draft of this paragraph arguing for `Nx` was
reading a prototype rather than a decision.

## Also found: Tiles misses five-across by four units

Five tiles need 1112 units; the design's padding leaves 1108, so it wraps to four columns
and the card grows a row. This is latent in the design file too, which misses it by 2px at
its 600px draw. Setting the card's padding to **32 — already `CARD.padding`, and on
DESIGN's spacing scale, where the design's 44 is not** — gives five across. All numbers
above are at 32, with the three-row cap. GOTCHAS 048.


---

# Phase 2 — the 225 symbols

Every map entry drawn as a real Tiles tile by `scripts/symbol-sheet.ts`, with the real
fonts and tokens, because the question is whether a symbol reads *on a card* rather than
whether it looks sensible in a table. The small grey label is the layer. **Reviewed and
frozen 2026-09-30.**

| light | dark |
|---|---|
| ![symbols, light](./symbols-light.png) | ![symbols, dark](./symbols-dark.png) |

## How they were chosen

`scripts/symbols.ts` proposed; a person decided. The ladder is the periodic table's own
rule — the first two letters, or the first plus a later one where that is taken — with
both initials tried first for multi-word names, because `Ga` says GitHub Actions and `Gi`
says nothing.

Three things outrank the ladder, none of them taste:

- **The designer's 26 picks**, read off `docs/design/directions/tiles.dc.html`. Where a
  real decision already existed it beat the heuristic: the ladder had given Tailwind `Ti`
  and webpack `We` while `Tw` and `Wp` sat free, because it takes the first available
  letter in name order rather than the idiomatic one.
- **Languages and runtimes**, because `weight` ranks within a layer and types.ts
  deliberately depresses them — "the header already names the primary language" — which
  has nothing to do with symbols. Without this, weight order hands Python `Pk`.
- **Everything on Stackshot's own card**, because Site C generates it on load and it is
  the first card every visitor sees. Satori had `Sb`, which reads as Supabase or
  Storybook; it took `Sr` and Starlette yielded. A product reason, not a popularity one.
  All ten entries on our card were checked the same way and the other nine were already
  derived from their own names.

Everything else went by how widely used a technology is: the common one keeps the natural
symbol, the niche one yields.

## What the scarcity actually looks like

`P` and `S` are **saturated** — all 26 combinations of each are taken. There is no free
slot on those initials, so any future change there is a trade: one entry's gain is
another's meaningless letter. `A`, `D`, `N` and `R` still have room.

```
pnpm tsx scripts/symbols.ts            the allocation, and free letters per initial
pnpm tsx scripts/symbols.ts "Bun"      candidates for a name not yet in the map
```

Twelve entries carry a letter not derived from their own name, all on crowded initials and
all of them cases where every letter they wanted was held by something more common:
`Redux Rc` · `Typer Tc` · `Puma Px` · `Prometheus Pk` · `Poetry Pb` · `SWC Sh` ·
`Stylelint Sj` · `Pint Pw` · `PHPStan Pq` · `pre-commit P0` · `PHPUnit Pz` ·
`Starlette Sb`. Prometheus is the starkest: `Pr`, `Po`, `Pm`, `Pe`, `Pt` and `Ph` are all
held by more common names.

Two that were close and went the other way for a documented reason: `Sw` stayed with SWR
rather than SWC because the design file hand-picked it, and `Rd` stayed with Redis rather
than Redux because Redis spans every ecosystem while Redux is JavaScript-only.

## Changing one

Edit `symbol:` in `lib/stack-map/entries/*.ts`. The map-integrity test enforces the format
and uniqueness, so a clash fails the suite rather than shipping two identical tiles.

**A symbol edit is cheaper than this section said, since ADR-0030.** The symbol is a field
on `StackItem`, so changing one changes the `stackHash` of every repo containing it: those
cards land on a new `png:` key by themselves, and no `RENDER_VERSION` bump is needed.
Cards without that entry keep their bytes. What still holds is that a symbol must never be
*derived*, because then it would depend on map order — `scripts/symbols.ts` proposes and
does not write, for that reason.

---

# Phase 2 — the Tiles renderer

`lib/render/tiles.tsx`, measured the same way as the prototype above. The prototype was honest: heights land within
ten units of it and bytes within 2%, so ADR-0029's storage arithmetic needed no correction.

| Repo | Rows | Height (was) | PNG (was) | base64, both themes (was) |
|---|---|---|---|---|
| vercel/next.js | 3 | 859 (869) | 191 KB (191) | 507 KB (495) |
| mastodon/mastodon | 3 | 859 (869) | 186 KB (186) | 493 KB (482) |
| pmndrs/zustand | 2 | 651 (659) | 141 KB (142) | 373 KB (368) |
| github/gitignore | 1 | 443 (449) | 53 KB (54) | 140 KB (139) |

A row costs exactly 208 units — a tile plus a gap — so the three-row cap is a straight
line rather than an estimate. `tests/tiles.test.ts` pins that, and pins five across, which
is the number GOTCHAS 048 missed by four units.

The card is painted on `#FFFFFF` light and `#12171C` dark rather than on `surface`: the
tints were drawn against white, and on `#EDEEEA` the tooling tint is three points from the
card and disappears. ADR-0030.
