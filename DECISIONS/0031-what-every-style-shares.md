# ADR-0031: What every style shares, stated once

**Status:** Accepted
**Date:** 2026-10-01
**Amends:** ADR-0029 ("every style shares the header, the footer and the layer colours"),
ADR-0030 (which kept `CardHeader` on that list)
**Supersedes in part:** DESIGN.md COLOR (`accent` appears exactly once, as the bar at the
card's top edge)

## Context

ADR-0029 said every style shares the header, the footer and the layer colours. ADR-0030
narrowed "the footer" and the frame out of that sentence one phase later, and kept
`CardHeader` in it. Phase 3 broke the remainder on its first day: `terminal.dc.html` has no
owner-over-repo block at all. It has a prompt line and the repo as a single mono string —
`vercel/next.js` at 36 units in Commit Mono 700 — where the Datasheet and Tiles set the
name in Archivo on the 64→36 `displaySize` ladder.

Two amendments to one sentence in two phases is not a sentence that needs a third
amendment. **The original claim was wrong rather than imprecise**, and the author has
confirmed it as their own instruction rather than a misreading. So this record states the
rule once, for the two styles that exist, the one that is built and the one that is not.

## Options considered

**A — Keep `CardHeader` everywhere.** One component, one long-name strategy, one place
the size ladder lives. It puts a 64-unit Archivo display name inside a terminal window,
which is not a terminal; the genre is the product, and a style that abandons its genre is
a style not worth offering.

**B — Share the facts, not the component.** Each style presents owner, repo, language and
stars in its own voice. Costs a per-style answer to the 100-character repo name, which is
the single sharpest edge in this codebase (GOTCHAS 039).

## Decision

**B, and the rule in full, for every style including the two not yet built:**

| Shared by every style | Owned by the style |
|---|---|
| **The facts**: owner, repo, language, stars — the same strings, from the same `StackDoc` | How those facts are set: face, size, ladder, layout |
| **The domain line**, in `TYPE.meta` | Where it sits and what shares its row |
| **`LAYER_COLORS`** | How the layer is expressed — rule weight, tint, key colour |
| **The canvas width**, 1200 | The height, fixed or content |
| **A bounded repo name**: no card may grow unboundedly on a 100-character name | The mechanism — a size ladder, a clamp, or both |

A style is a way of saying the same facts. It is not a reskin of one card, and nothing
below the facts is shared by default.

**Terminal's own answers**, for the record: a mono one-liner at a fixed 36 with no ladder,
clamped to two lines by `wordBreak: break-all` and `lineClamp: 2`, over a prompt line
clamped to one. There is no ladder because a terminal does not resize its own output; the
ellipsis is what a shell does to a path that does not fit, so the fallback reads as the
genre rather than as damage.

**`accent` appears a second time on a card**, as the `$` of the prompt. DESIGN gives it
one use, the Datasheet's top bar. The argument for the exception is that here the colour
is literal rather than decorative — a prompt sigil is the one glyph on any Stackshot card
that is quoting something real. It is still one hue, still one meaning per card, and no
other element of Terminal carries it.

## Consequences

- **Four long-name strategies instead of one**, as the styles land. Two exist and both are
  tested against `"a".repeat(100)`; the test is the contract, not the component.
- **`CardHeader` is the Datasheet's and Tiles'**, and `chrome.tsx` is now three kinds of
  thing: shared content (`DOMAIN`, `starsLabel`), a shared-by-two component
  (`CardHeader`), and one style's frame (`SheetFrame`). If Tags shares nothing with
  `CardHeader` either, that file should be split by owner rather than grown.
- **Terminal is the cheap style.** Measured: 608 units and ~148 KB for `vercel/next.js`
  against Tiles' 859 and ~191 KB, and 272 units for a one-layer repo. Text, no tints, no
  grid. It is the style to prefer if KV bytes ever bind, which is the opposite of the
  pressure ADR-0029 planned for.
- **The 8.75px floor moved a number the design had settled.** Tree rows are 30 units, not
  the design's doubled 27: Terminal has no symbols, so its item names are the whole card
  and the floor applies to them where ADR-0029 deliberately let Tiles' names fall below
  it. The fixed label column was re-derived from that size rather than scaled with it.
  **Verified in the GitHub mobile app on 2026-10-01**, on the densest card: every name
  reads without zooming. ADR-0011 set that surface as the bar and this clears it.
- **No existing bytes moved.** Adding Terminal left all 22 committed hashes identical and
  added eight; `RENDER_VERSION` 3 retires the Datasheet bytes that `png:v2:terminal:*` has
  been serving.

## What would make us revisit

- **Tags wanting `CardHeader` back.** Two styles using it and two not is a component with
  an owner; three of four would mean Terminal is the exception and should say so instead.
- **A long name reading as broken in the wild.** The ellipsis is defended as shell-like;
  if it reads as a bug on a real repo, the answer is a mono size ladder, not a smaller
  clamp.
- **A fifth style.** This table is written for four. At five, the right shape is probably
  a `StyleDef` that declares its header and frame rather than a convention held by prose.
