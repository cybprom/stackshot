# ADR-0039: Layout C ships, and the first load stays still

**Status:** Accepted
**Date:** 2026-11-09

## Context

Phase 5 built two heroes to compare live (ADR-0037). The author chose C, then redesigned
it after using it: the auto-generate at 0.9s made the panel expand and jump on first
load. The redesign changes what C does as well as how it looks.

## Options considered

**A — Keep C's intro and restyle around it.** Cheapest. Keeps the jump that prompted the
redesign.

**B — Open the panel only on a successful resolve.** No empty right column on a failure,
but nothing answers the press for as long as GitHub takes.

**C — One column until the first Generate; open on the press.** The press is answered
immediately, at the cost of deciding what a failed first Generate shows in the open column.

## Decision

**C.** Layout A is deleted, and `/` is static again.

- **The panel opens once, on the first Generate or Try**, and never closes. It is
  top-anchored, so anything that changes its height pushes downward only.
- **Under reduced motion the panel still starts in one column** and snaps. The design
  asked for two columns from the start, but the server cannot see that setting, so it
  would bring back the layout flash in GOTCHAS 061.
- **A failed first Generate shows that repo's real error card** in the open column, which
  is what its README would get, and Copy stays hidden so nobody copies the example card's
  snippet. A later failure naming a repo does the same and clears the previous card, its
  snippet and its stack list. A typo or the per-IP limit names no repo, so the card stays.
- **The first read shows a blank plate**, sized by the hidden example image, so nothing
  shows another repo's card while this one loads.
- **The opening is CSS width plus a measured height animation.** View Transitions were
  tried behind a flag and rejected: they fade two stretched snapshots of the whole panel.
- **The wall is dark cards only, six columns, moved only by scroll.** Six so the outer
  columns run off the edge at any width. This lifts MOTION's "no scroll-triggered
  anything" for this one element. It uses CSS scroll timelines; a browser without them
  gets a static wall and a solid nav, the safe half of both.
- **Generate stays in Commit Mono** though the design drew Archivo: its label scrambles
  (ADR-0038), and a proportional face jitters on every frame. The status line above the
  card scrambles the same way.
- **The status line and focus border use the accent**, widening DESIGN's accent rule for
  the site. The card's rule is unchanged.
- **Taken from the design with changes, or left out.** Two download links rather than one
  button, because browsers block or prompt on two downloads from one click. No repo
  description in the README frame: it is not in `StackDoc`, and adding it would change
  every `stackHash`. No Copy on the illustrative snippet. The caption says "real repos"
  because the wall is refreshed monthly, not "this week".

## Consequences

The intro PNGs stay: they are the dimmed card in the slot during a first Generate and the
pair in the snippet section. `lib/hero.ts` survives as the panel's and the wall's numbers.
"drawn in" reports real time from submit to PNG up, so it is slow on a cold repo and says so.

## Revisit triggers

- A first load that shows no card measurably hurts generate rate (ADR-0012's counters).
- Scroll timelines cost frames on low-end phones.
