# ADR-0036: The technology index renders from props, not from the DOM

**Status:** Accepted
**Date:** 2026-10-04

## Context

The homepage shows the whole stack map — 225 entries — as a searchable grid of tiles,
filtered by a query and by layer chips, capped at two rows until "Show all N".

The map is the biggest static thing the site has. Shipping it to the browser twice —
once as the HTML a reader sees and once as JSON for a client component to filter — is the
obvious waste, and the obvious thing to avoid.

## Options considered

**A — Server-render every tile; a client island filters by mutating the DOM.** The map
crosses the wire once, as markup. `hidden` for filtering, CSS `order` for ranking, and the
island builds its index on mount from `data-` attributes and the tiles' own text, so there
is no second copy of anything.

**B — Build the index on the server, pass it to a client component as props.** Ordinary
React. The entries ride in the RSC payload as well as in the rendered HTML, so the five
fields a tile needs cross the wire twice.

**C — Server-render the visible rows, round-trip on each search.** Smallest first paint, a
request per keystroke for data that is already local. Not seriously considered.

## Decision

**B. A was built first and the React Compiler rejected it**, on three counts: mutating
`el.hidden` on nodes it did not own, calling `setState` inside the effect that did the
filtering, and reading a ref during render to label the "Show all" button.

Those are not stylistic complaints. They are the compiler saying the component lies about
what it depends on, and the fix in each case is either a lint suppression or a more
contorted version of the same trick. **A lint suppression on the page's largest component
is a worse thing to own than 5.8KB on the wire** — it is permanent, it disables the check for
everything that comes after it in that file, and the next person to touch the index
inherits a component the framework has already said is wrong.

The measured cost of B is 26.2KB of JSON, **5.8KB gzipped**, for `id`, `symbol`,
`display`, `category` and a search blob across 225 entries. **The map itself still never reaches the
browser** — not the descriptions, the weights, the suppressions or the aliases, only a
de-namespaced search string built from them.

**Ranking is a sort on one function.** `score()` returns a number or `null`, the grid
orders by it, and the tiers are spread (100 / 80 / 60 / 40) rather than consecutive. So
the fuzzy matcher this will eventually want is a change to `score()` and to nothing else —
which was the one thing option A would have made genuinely harder, since reordering
server-rendered nodes means CSS `order` and a scoring pass that cannot re-render.

## Consequences

- **`lib/tech-index.ts` is render-free and tested**, like every other piece of logic here.
  The grid is markup; the matcher is a pure function with a table-driven test.
- **Aliases are searchable and de-namespaced**, so `psycopg` finds PostgreSQL — a package
  name is what someone has in their manifest and often not what the thing is called.
- **Punctuation-stripped names are indexed too.** A test asked for `nextjs` and got
  nothing: the display is `Next.js` and the alias is `next`, and neither contains it.
  People type `nextjs` and `nodejs`. Nothing but a test was going to find that.
- The first build is deleted rather than kept behind a flag. Two filtering paths for one
  grid is how the slower one rots.

## What would make us revisit

- **The map outgrowing the page.** At 225 entries a 6KB payload is noise; at 2,000 it is
  not, and the answer then is C — a server-filtered search — rather than going back to A.
- **The React Compiler relaxing.** It will not, and this is the better component anyway.
