# ADR-0033: The error card is one content tree in the requested style's frame

**Status:** Accepted
**Date:** 2026-10-02

## Context

`renderErrorCard` took no style, and `SheetFrame` was the only frame it had. So a failing
`tiles-dark.png` returned the Datasheet's error card: an accent bar, a 3-unit `ink` border,
radius 2, and a rotated gutter label — a style the reader never asked for.

**Tiles is the default and `card-*.png` is pinned to it**, so this is the frame most failing
embeds in the wild would show. ADR-0030 recorded it as a launch blocker rather than an open
question, because it is not a correctness bug: I5 holds, the route returns 200 with an
image, and nothing is wrong until a stranger embeds a repo that stops resolving. That is
exactly why it would have stayed invisible.

## Options considered

**A — Declare the error card deliberately one object, whatever was asked for.**
Defensible: a failing repo has no layers, so there is nothing style-specific to draw, and
ADR-0007 already treats the error card as "the same object with different content". Costs
nothing. But it answers a question nobody asked — the complaint was never about the
content, it was that a card which had been a soft hairline rectangle becomes a bordered
datasheet with an orange bar the moment the repo 404s. In a README that reads as a
different product, not as an error.

**B — A full error tree per style.**
Three trees for five reasons of two sentences each. The content would be copied three times
and would drift three ways, and `ERROR_COPY` exists precisely so the card and the site
cannot drift. The error card is not a design surface that wants three expressions.

**C — One content tree, in the requested style's frame.**
ADR-0030's own title is "the frame is the style", and the frame is the whole complaint.

## Decision

**C.** `renderErrorCard` and `ErrorCard` take a `CardStyle`. One `ErrorBody` — the label,
the reason, the detail — rendered inside whichever frame was asked for.

**The label leads the body, under the header, rather than sitting in the bottom row.** The
bottom row is metadata: the legend that decodes layer colour, the domain. The failure is the
card's whole message and is read first. It is set in `TYPE.gutter`, the gutter label's own
step, unrotated — the same signage, placed differently, not a new element.

**The Datasheet keeps its gutter and its derived 518.** Its bands are fixed, so the rotated
label still has a band to centre in and the height is still computed from the tokens. Tiles
and Terminal draw their error cards at content height, as they draw their real cards. Tags
borrows the Datasheet's, as its real card does, until it has a renderer (ADR-0034).

**This bumps nothing.** Error cards are never stored under a `png:` key —
`lib/serve-card.ts` renders and returns without `setPng` — so no cached bytes are at stake
and `RENDER_VERSION` is untouched. It is the only card change in this project that does not
bump, and the reason is worth stating so nobody "fixes" the omission.

## Consequences

- **`TilesFrame`, `TerminalFrame`, `TerminalPrompt`, `TerminalTitle` and `DomainLine` moved
  into `lib/render/chrome.tsx`**, joining `SheetFrame` for the same reason it was already
  there: each is now shared between a real card and an error card, and a second copy would
  drift. `chrome.tsx` is no longer "the Datasheet's frame plus shared pieces" — it is every
  frame.
- **The frame extraction was verified pure before anything else changed.** All thirty
  committed hashes — twenty-four real cards and six Datasheet error cards — came back
  byte-identical with the frames pulled into `chrome.tsx`. That measurement is the whole
  value of doing it in that order, and it is why the one deliberate change after it is
  attributable rather than lost in a diff.
- **That one change is `card/error-detail`**, a new type step: `card/version`'s size with a
  28px line box instead of 1.10. The detail is the only line of mono prose on any card that
  **wraps**, and at 1.10 its two lines set solid. A separate step rather than a looser
  `card/version`, because that step is an inline string after a name. It moves the six
  Datasheet error hashes and **no real card** — `TYPE.version.lineHeight` turned out to be
  read by nothing but the two error details.
- `render-hashes.json` goes from 30 to 42 entries.
- **`tests/fit.test.ts`'s gutter clearance is scoped to the Datasheet.** The clearance exists
  because the label is rotated and absolutely positioned inside a fixed band; run against a
  flat label in a content-height body it compares an unrotated width to a band the label
  does not sit in, and fails claiming 1132 ≤ 240.
- **DESIGN.md's "the card's gutter labels are the only all-caps in the project" needs its
  amendment line.** Two frames now carry that label flat in the body. The claim it was
  protecting — no all-caps on the *site* — is untouched.
- Satori hangs rather than throws when a component returns a fragment where it wants a flex
  child, which is how this change first failed. GOTCHAS 058.

## What would make us revisit

- **A fourth style whose error card wants different words, not just a different frame.**
  Then the content is not one object after all and B was right, and the place to put the
  difference is `ERROR_COPY`, not a second tree.
- **The flat label reading as a heading rather than as signage.** It is the one element
  borrowed from a context it no longer sits in; if it reads wrong, drop it and let the
  reason sentence lead alone.
