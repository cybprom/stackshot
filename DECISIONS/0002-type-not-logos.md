# ADR-0002: Render technology names as type, not logos

**Status:** Accepted
**Date:** 2026-09-21

## Context

The obvious way to show a tech stack is a grid of logos. It is also what every existing
tool in this space does.

## Options considered

**A — Third-party logos, normalized to a square bounding box.**
Instantly scannable; a developer recognizes the React atom faster than they read the word
"React". But: many logo licences forbid recoloring, and we must recolor for the dark
theme; Satori can only render images as data URIs, so ~200 SVGs become a bundling,
inlining, and payload problem; aspect ratios vary wildly, wordmarks (Vercel, Stripe) sit
badly next to glyphs (React, Vue); many tools have no logo at all; and the trademark
question never fully goes away for a product that generates images at scale.

**B — Names set in a distinctive type treatment.**
No licensing exposure, no asset pipeline, no normalization problem, no missing-logo case.
More original — it is the road not taken by every competitor. Slower to scan at thumbnail
size, which is the real cost.

## Decision

B. The scanning cost is real but is mitigated by the structural layering: a reader gets
"frontend-heavy, three infra items, no backend" from the card's shape before reading a
single word, and the words are there when they look closer.

The deciding argument is originality. Logo grids already exist (skill-icons and similar),
and a logo grid would make Stackshot look like a clone of them. The type treatment is the
design idea.

## Consequences

- The type treatment now carries the entire visual identity, so it has to be good. This
  raises the stakes on DESIGN.md's TYPE section considerably.
- No asset pipeline, no CDN for icons, no licence audit. The whole category of work
  disappears.
- Adding a new technology to the map costs one line of data, not a sourced and normalized
  SVG.
- We lose the pre-attentive recognition that makes logo grids readable at 200px. If
  Milestone 0's mobile screenshots show the card is unreadable at that size, the fix is
  fewer items and bigger type, not logos.

## What would make us revisit

- Milestone 0 shows names are illegible at GitHub mobile widths even after a type-size
  redesign.
- Users consistently describe the card as "a list" rather than "a diagram".
