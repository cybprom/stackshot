# ADR-0009: Per-technology descriptions live on the site, not on the card

**Status:** Accepted
**Date:** 2026-09-21

## Context

The brief specified a one-line note on each technology, on the card. At the intended
rendered sizes, that is the first thing that stops working.

## Options considered

**A — Descriptions on the card, beneath each name.**
More informative and closer to the "datasheet" genre. But a 1200-unit-wide card displayed
at ~600px on desktop and ~390px on GitHub mobile renders a 16-unit description at roughly
4–5 effective pixels. It becomes grey mush, and worse, it becomes _texture_ — it makes the
card look busy without communicating anything.

**B — Names and versions on the card. Descriptions as HTML on the site, beneath the
preview.**
The card stays legible at every size. The descriptions become selectable, searchable,
translatable text rather than pixels.

## Decision

B. The deciding constraint is GitHub mobile at ~390px, which the brief correctly
identified as the hard constraint that should drive everything.

There is a second benefit: writing 120 good one-line descriptions is the slowest part of
building the map. Making them site-only means a missing description degrades the site
slightly instead of leaving a hole in the card.

## Consequences

- This contradicts the brief as written. Flagged and agreed before planning.
- The card carries less information and relies harder on the layering to communicate. That
  raises the stakes on the gutter labels being legible.
- Descriptions still need writing for the site, but they are no longer blocking the card.
  They are the first thing cut if Milestone 3 runs long (see ROADMAP fallbacks).
- The site now has a reason to exist beyond being a form, which slightly improves the
  case for the one page.

## What would make us revisit

- Milestone 0 shows the card is comfortably legible at 390px with room to spare, and the
  bands look empty.
