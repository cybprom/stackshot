# ADR-0037: Two heroes around one generator, and what C needs that A does not

**Status:** Accepted
**Superseded in part by:** ADR-0039 (A is deleted; C has no intro or entrance)
**Date:** 2026-10-07

## Context

Phase 5 step 5 builds page designs A (Playground) and C (Gallery wall) to be compared
live, with an env var picking the live one and `?layout=` previewing the other. One is
deleted at step 7. ROADMAP's rule for the step is that the generator, preview, snippet,
technology index and footer are identical in both and **only the hero differs**.

That rule is easy to state and easy to break, because the generator did not exist as
parts. `app/stack-form.tsx` was one client component that owned the state *and* decided
the stacking: field, status, switchers, plate, snippet and downloads, in that vertical
order, with its own margins. C needs the switchers beside the card and Copy under it.

## Options considered

**A — One generator component with a `layout` prop**, branching internally. One state
owner, no indirection, but both heroes' markup lives inside the shared component and
"only the hero differs" stops being true in the file tree. Deleting a layout then means
editing the shared file rather than deleting a file.

**B — A context provider plus placeless parts.** `app/site/generator/` holds the state
and six parts that take no width, margin or order of their own; `hero-a.tsx` and
`hero-c.tsx` compose them. One more indirection, and adding a field means touching the
provider rather than one file.

**C — Lift the state to the page.** Impossible as written: the page is a server component.

## Decision

**B.** The refactor landed first, as a no-op — same page, same DOM order, suite green and
a screenshot against the previous build — so that the heroes were purely additive and any
regression in the generator's gate timing would have shown up before either hero existed.

Four things C needs that A does not, each of them a rule bent on purpose:

- **A shadow on the panel**, against SURFACE's "shadows: none". The rule's argument is
  that a card in a README should sit flat and the site must not contradict the card.
  Neither reaches this: the panel is not a card, and it is the only element on the site
  genuinely in front of something — a wall that moves behind it.
- **An entrance** (`.panel-in`), against MOTION's "anything on initial page load". C's
  whole proposition is a wall with one panel in front of it; a panel that is simply
  present reads as a screenshot of the idea.
- **Two pinned bands**, `.theme-dark` for the nav and `.theme-light` for the panel. A
  gallery is a dark room, and the wall shows light and dark cards side by side, which
  reads against one ground only.
- **A radius above the plate's**, `--radius-panel: 16px`.

The prototype's `.bob` on the logo mark is **not** taken. It is infinite idle decoration
on a component A shares, and there is no argument for it beyond liveliness.

**The panel is pinned light rather than following the reader.** This was decided the other
way in the plan and reversed by looking: on a dark page, `--surface` is `#0E1113` and so
is the band, so a panel that followed the reader had the same colour as the wall behind
it, no edge, and a shadow that does nothing against near-black. The composition was gone.
The cost is a lit panel in a dark-mode page, which is what the design intends — it is a
spotlight — and the previewed card inside it still follows the reader, because
`.theme-light` deliberately does not touch `--preview-page` or the `.scheme-*` rules.

## Consequences

- **Step 7 is a deletion, not an edit.** One hero file, plus `lib/hero.ts`, the wall, and
  the C-only CSS block. The survivor's copy block in `lib/site.ts` loses its prefix.
- **`/` is dynamic for the life of the fork.** Reading `searchParams` opts the route out
  of static rendering, which costs a render per homepage view of a page carrying 32 wall
  cards and 225 index tiles. Accepted because the fork expires in days; the alternative
  was a second route, which ARCHITECTURE's routing note forbids until the card route
  moves under a prefix.
- **A's hero is two columns, so the card's left edge is no longer the page's alignment
  spine** (DESIGN SELF-CRITIQUE 5). The spine holds inside each column. DESIGN's rewrite
  at step 8 is where this is reconciled rather than patched.
- **The empty state no longer calls the card route.** Both heroes show the intro card's
  build-rendered bytes from `public/`, which is what `introCardUrl` was built for in
  ADR-0035 and what "the homepage makes no GitHub call on any path" requires. The page
  had still been pointing the example at `cardUrl`, which resolves from GitHub on a cold
  cache.
- **The hero headlines are two new type steps**, `site-hero` (68/800) and
  `site-panel-title` (54/800), both stepping down on a phone. One dies at step 7 and the
  survivor joins DESIGN's site scale at step 8. Milestone 3's headline — the line DESIGN
  had already named as doing marketing work rather than naming the thing — is replaced in
  both.
- **The snippet is behind a disclosure**, not on the page and not absent. Both designs put
  a Copy button in the hero and no code block, which is right until the clipboard write is
  refused; the disclosure opens on that failure and the message points at it.
