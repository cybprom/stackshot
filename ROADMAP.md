# ROADMAP.md

## Current state

*Update this at the end of every session. It is the first thing read after a `/clear`, and
it is the only thing that survives one.*

```
Milestone:  3 COMPLETE and committed. Now on the CARD STYLES direction
            (ADR-0029): the card becomes a choice of styles. Phases 0
            (de-risk), 1 (plumbing), 2 (TILES) and 3 (TERMINAL) are done.
            Phase 4, the site generator, is next.
PHASES:     0 de-risk DONE · 1 plumbing DONE · 2 Tiles DONE · 3 Terminal
            DONE · 4 site generator (switcher, theme toggle, HTML preview
            + crossfade) · 5 docs. Aiming at one weekend, nothing cut so
            far. The fallback cut order, if P4 runs long: per-style
            reveals first, then the Light/Dark toggle, then the HTML
            preview LAST — it is the drift detector AND what stops the
            switcher writing a PNG per flip. Terminal was third on this
            list and is now built, so the list is shorter than it was.
AFTER P4:   TWO PAGE DESIGNS, built to be compared live, not one chosen on
            paper. A (Playground) and C (Gallery wall) from
            docs/design/site/. Build them as THIN LAYOUT SHELLS around
            shared components: generator, preview, snippet, technology
            index and footer are identical in both — ONLY THE HERO
            DIFFERS. An env var picks the live layout; ?layout=a and
            ?layout=c preview the other. Once the author chooses, THE
            OTHER IS DELETED — this is a fork with an expiry, not a
            feature. Detailed page planning deliberately not started.
            Behaviour already settled in that README, all of it the
            generator's business rather than the hero's:
             - C auto-generates cybprom/stackshot ~0.9s after load, SERVED
               FROM CACHE so the intro costs no GitHub budget; under
               reduced motion the page loads already expanded.
             - The preview area animates its height (measure, set explicit
               height, transition). C's panel animates width the same way.
             - C's wall must be taller than the tallest hero: eight
               distinct cards per column, duplicated for the loop, so a
               tall card never opens a gap.
             - Technology index shows 2-3 rows then "Show all N". Search
               and the layer filter are the navigation. No pagination, no
               inner scrolling box.
             - Tiles previews use the three-row cap, the same allocation
               as the renderer (lib/render/tiles-layout.ts).
P4 GENERATOR: Style switcher + Light/Dark/System toggle on the preview.
            The TOGGLE IS PREVIEW-ONLY: the snippet always emits <picture>
            with both themes, so System is the real README behaviour and
            the toggle is a convenience, not a product capability.
            The switcher MUST feed the copied snippet — pictureSnippet in
            lib/site.ts already takes a style and tests/site.test.ts
            asserts it never emits card-*.png.
            The preview draws in HTML first and the real PNG crossfades in
            once decoded, so a drift between the two implementations of a
            style is visible rather than theoretical. That HTML preview is
            ALSO what stops the switcher writing a PNG per flip — cutting
            it has a storage cost, not just a polish cost (ADR-0029).
            Reveals, timings and the two loading phases are in
            docs/design/directions/preview.dc.html.
P5 DOCS:    DESIGN.md still describes only the Datasheet and needs the
            styles. ADR-0029 already exists and is current.
BLOCKS      A FAILING TILES URL RENDERS THE DATASHEET'S ERROR FRAME —
LAUNCH:     accent bar, 3u ink border, radius 2 — because renderErrorCard
            takes no style and SheetFrame is the only frame it has. TILES
            IS THE DEFAULT AND card-*.png IS PINNED TO IT, so most failing
            embeds in the wild would show a frame from a style the reader
            never asked for. Fix in Phase 5 at the latest: either give
            renderErrorCard the style and a frame per style, or decide
            that the error card is deliberately one object and say so in
            ADR-0007. NOT a correctness bug — I5 holds, it is 200 and an
            image — which is exactly why it will be invisible until
            someone embeds a broken repo. ADR-0030 has the context.
OPEN:       tags-*.png SERVES DATASHEET BYTES today — the last stand-in,
            because CARD_STYLE_DEFS maps every style to something. Nobody
            is served a wrong card (the site never offers it) but the URL
            lies, and Tags is post-launch so it will lie for a while.
            DECIDE BEFORE LAUNCH: 404 the styles that have no renderer, or
            ship Tags. A 404 needs care: the card route's I5 says a card
            request always returns 200 with an image, so this is "not a
            card request" territory like a bad filename, not a failure
            card.
STYLES:     Every CardStyle needs an entry in lib/render/styles.ts.
            ONLY TAGS still draws the Datasheet tree as a stand-in, and it
            is post-launch.
            REPLACING A STAND-IN BUMPS RENDER_VERSION, or PNGs cached
            under that style's key get served as the real thing.
            A style's HEIGHT IS `number | "content"` — never undefined,
            which a default parameter turns back into 800 and clips the
            card in silence (GOTCHAS 050).
            THE FRAME IS THE STYLE'S OWN (ADR-0030): shared is the header
            content, the domain line and the layer colours; per style is
            the border, radius, accent bar and what shares the bottom row.
            lib/render/chrome.tsx holds the shared pieces plus SheetFrame,
            which is the DATASHEET's frame and the error card's.
            EACH STYLE PAINTS ON ITS OWN SURFACE: TILES.surface
            (#FFFFFF / #12171C) because the tints were drawn against
            white and the tooling tint disappears on #EDEEEA;
            TERMINAL.surface (#FAFAF7 / #0A0D10) because a terminal sits
            off the page. Tiles' is mirrored in globals.css as
            --tiles-surface with tests/tokens.test.ts as the seam;
            Terminal's needs the same when P4 draws its HTML preview.
            ADR-0031 STATES THE SHARING RULE ONCE, FOR ALL FOUR STYLES:
            shared are the facts (owner, repo, language, stars), the
            domain line in TYPE.meta, LAYER_COLORS, the 1200 canvas and a
            BOUNDED repo name. Everything else — frame, header
            presentation, height — belongs to the style. Do not re-derive
            this per style; it has been wrong twice already.
Deployed:   LIVE at https://stackshot-one.vercel.app (project "stackshot",
            org cybproms-projects, region iad1, plan hobby, fluid compute,
            platform function timeout 300s; both routes pin maxDuration 30).
            stackshot.ilerioluwa.com IS LIVE (author-confirmed 2026-09-29),
            which is SITE_ORIGIN's default. MAIN HAS BEEN PUSHED and pushes
            auto-deploy production. RENDER_VERSION IS 3: the bump retires
            the Datasheet bytes that png:v1:tiles:* and png:v2:terminal:*
            were serving while those styles were stand-ins. NOT YET PUSHED
            as of this commit, so production still serves the stand-ins
            until it is.
            Upstash EVICTION IS ON, so a full database drops old keys instead
            of failing writes.
            Measure against the stable alias, never the per-deployment URL:
            that one 302s under Deployment Protection (the spike's trap).
            .env.local holds GITHUB_TOKEN, the two Upstash vars and a
            VERCEL_OIDC_TOKEN that `vercel link` wrote. It is gitignored and
            covered by a deny rule — read it only via process.env.
CACHE KEYS: every Upstash key is `{VERCEL_ENV}:...`, so a local `next dev`
            writes `local:*` and cannot be served to strangers. This was a
            real incident, not a precaution (GOTCHAS 043). png: also carries
            `v{RENDER_VERSION}`. If you change what a card looks like, bump
            RENDER_VERSION in lib/tokens.ts and regenerate
            tests/fixtures/render-hashes.json IN THE SAME COMMIT — the test
            fails and tells you, ADR-0005's amendment says why.
SITE_ORIGIN: lib/site.ts is the single source for the origin in the card
            footer, the preview <img> and the copied snippet. Defaults to
            https://stackshot.ilerioluwa.com; override with
            NEXT_PUBLIC_SITE_ORIGIN. Local dev MUST set it to its own port
            (`NEXT_PUBLIC_SITE_ORIGIN=http://localhost:PORT pnpm dev --port
            PORT`) or the preview points at production. Preview and snippet
            are the same absolute URLs, so the CDN entry is shared and
            same-origin `download` works.
Last done:  PHASE 3 — TERMINAL (this session). lib/render/terminal.tsx at
            height "content": prompt line, mono one-line repo ref with its
            own clamps, the ├──/└── layer tree, domain. RENDER_VERSION 3,
            hashes regenerated — NOTHING MOVED, eight terminal:* added.
            ADR-0031 settles what styles share, after ADR-0029's claim was
            amended twice; read it before building Tags.
            Tree rows are 30u NOT the design's 27 (7.8px in the apps, under
            the 8.75 floor, and Terminal has no symbols to carry it), and
            the 240u label column was re-derived from that.
            tests/terminal.test.ts: the label never wraps, └── is last,
            the box glyphs advance as mono, a wrapped item row costs
            exactly 46u, and a 100-char name stays in two lines.
            Terminal is the CHEAP style: 608u/148KB for next.js against
            Tiles' 859u/191KB — the lever if KV bytes ever bind.
            TERMINAL.rowGap is 24, not the design's 12: the box glyphs'
            ink is 51u in a 42u line box, so 12 left the stems 3u apart
            and the tree read as one broken line (GOTCHAS 051).
            PHONE CHECK PASSED (2026-10-01): every name on the densest
            card reads in the GitHub app without zooming, which is what
            the 30u decision was waiting on.
            Before it: PHASE 2 — the Tiles tree (4521b65), symbol on
            StackItem, the frame split out of chrome.tsx, ADR-0030, and
            GOTCHAS 050 (a default parameter turned content-height back
            into 800 and clipped every card; render FIRST, not last).
Next:       PHASE 4 — THE SITE GENERATOR. Style switcher +
            Light/Dark/System toggle on the preview; the TOGGLE IS
            PREVIEW-ONLY, since the snippet always emits <picture> with
            both themes. The switcher MUST feed the copied snippet —
            pictureSnippet in lib/site.ts already takes a style and
            tests/site.test.ts asserts it never emits card-*.png.
            The preview draws in HTML first and the real PNG crossfades in
            once decoded, so drift between a style's two implementations
            is visible rather than theoretical — and that HTML preview is
            ALSO what stops the switcher writing a PNG per flip (ADR-0029).
            THREE styles now have HTML to write, not one: sheet, tiles,
            terminal. symbol is on StackItem and reaches the client
            through /api/resolve, so a tile needs no map in the browser.
            TERMINAL.surface needs a --terminal-surface var in globals.css
            and a tests/tokens.test.ts seam entry, the way Tiles got one.
            Reveals, timings and the two loading phases are in
            docs/design/directions/preview.dc.html.
            Was: PHASE 2 — Tiles. Two halves: the 225 two-letter symbols
            (scripts/symbols.ts proposes on a ladder and REFUSES to
            auto-resolve collisions, because a symbol is baked into every
            cached PNG and order-dependence would silently invalidate cards
            nobody touched; then the author reviews a contact sheet of all
            225; then the map-integrity test enforces unique /^[A-Z][a-z0-9]$/),
            and the Satori tree. Use CARD.padding (32) NOT the design's 44 —
            five tiles per row instead of four, GOTCHAS 048.
            The contact sheet doubles as the name-fit check: longest display
            is styled-components at 17 chars, so nothing should reach the
            two-line clamp.
            PHONE CHECK PASSED (2026-09-29): symbols legible in the GitHub
            app, at the smaller-than-README size the spike README's side-by-side
            table renders them.
            M4 carries: the badge in your own README (the domain is live now,
            so this can come forward), the global budget guard, ADR-0012's
            amendment line for the separate bug counter, and monitoring KV
            bytes — ~790 stacks in Tiles alone after the three-row cap and the
            7-day png: TTL, ~430 if a repo is cached in two styles.
```

---

**Total: 3 weekends.** The brief called this a one-weekend warm-up. It isn't, and it is
better to know that now. The overrun is entirely in Milestone 1 — the curated map is real
work. If it slips, the pre-committed cut is in the Fallback section at the bottom.

A "weekend" here is roughly 10–12 focused hours.

---

## Milestone 0 — The Camo spike · 0.5 weekends

No UI, no GitHub API, hardcoded data, ugly script. The point is to answer the one question
that can kill the product.

> **Does a generated PNG render legibly in a real GitHub README, on both themes, at
> desktop and mobile width, through Camo — and can it be updated?**

Detection is not the scary part. Detection failing degrades gracefully into a sparser card.
Rendering failing means there is no product.

### Steps

Ordered by execution, which is not the order they were first written in. The rule: answer
the questions that can invalidate an ADR before the expensive build, start anything with a
wall-clock tail early, and leave the work that needs the real card until the environment is
known good.

1. Hardcode one `StackDoc` for a real repo. No network calls at all.
2. Render it twice (light, dark) with `satori` → `@resvg/resvg-js` → PNG, inside a Next
   route handler on the Node runtime, with a real embedded TTF. A **crude card** — border,
   accent bar, four bands, one text run per face, and the word `LIGHT` or `DARK` at display
   size so step 5's screenshots are unambiguous. Not the layout. Audit the font licences
   and the shipped weights here.
3. Prove **the rotated gutter labels** in a standalone script, with the one-letter-per-line
   fallback rendered alongside for comparison. Commit the result to `docs/spike/`. This is
   the piece most likely to be unsupported and it is cheap to test in isolation.
4. Deploy to Vercel and embed the `<picture>` block in a **throwaway public repo**. Two
   jobs. First, confirm resvg's native binary and satori's harfbuzz wasm resolve on
   Vercel — they are `serverExternalPackages` rather than bundled (GOTCHAS 016), and that
   is a deploy-time question. Second, **take the first honest cold-render measurement**:
   local numbers are warm-filesystem numbers and do not go into ADR-0011. Time a genuine
   cold start, several times, and record the spread against the 8s threshold. If the crude
   card is already near the line, say so here — the real card only costs more.
5. View on: desktop GitHub light, desktop GitHub dark, GitHub mobile web, GitHub iOS app,
   GitHub Android app. Screenshot every one and commit to `docs/spike/`. The question here
   is only whether each surface picks the right half of the pair.
6. On the dedicated TTL path: change the image bytes once, redeploy, and time how long
   until GitHub shows the new version. Try a `PURGE` request against the camo URL.
7. Build the full card layout. Publish to a fresh path, measure **cold render time on
   deployed cold starts** (same method as step 4, so the delta is attributable to the
   layout rather than the environment) and PNG byte size, and **re-shoot all five surfaces
   with the real card** for the legibility verdict at ~390px.

Then write ADR-0011.

### Spike URLs — three paths, pinned per path

Camo caches per URL, and separate URLs do not separate bytes: all three paths are served by
one handler from one hardcoded `StackDoc`, so step 7 would otherwise change what steps 5
and 6 are measuring. The handler pins its output per path.

| Path | Used by | Pinned to |
|---|---|---|
| `/spike/theme/…` | steps 4–5 | crude v1, always — unchanged by step 7 |
| `/spike/ttl/…` | step 6 | crude v1, then crude v2 at step 6's single change |
| `/spike/real/…` | step 7 | the real card |
| anything else | — | the real card |

The step-6 path is a measuring instrument. After its one byte change, any deploy that moves
its bytes voids the measurement and the step re-runs against a fourth path with a fresh
cache. **The crude renderer therefore stays in the codebase until ADR-0011 is written**, not
until step 7.

### Definition of done

All seven steps run, screenshots committed, measurements written into `GOTCHAS.md`, and a
go/no-go recorded as ADR-0011.

### Actual cost, against the 0.5-weekend estimate

**~4h30m elapsed**, from the first code artifact (`lib/stack-map/types.ts`, 02:10) to the
last evidence committed (step 7's screenshots, 06:41). Planning and the Part 1 document
corrections came before that and are not timestamped, so the true figure is somewhat higher
— call it under five hours.

The estimate was 0.5 weekends, and a weekend here is 10–12 *focused* hours, so 5–6. That
lands on target, but **two caveats matter more than the number** before it is used to
estimate Milestone 1:

- **Elapsed is not focused.** It includes a 25-minute idle-cold wait and two rounds of
  waiting on device screenshots that no amount of preparation would have removed.
- **This was an assisted session**, so the wall-clock figure is not a measure of human
  effort and does not transfer cleanly to a milestone whose hard part is human judgement —
  and Milestone 1's hard part is exactly that: deciding whether eight real repos produce
  cards worth looking at. The curated map is the work the estimate should be built around,
  not the code.

**Then tear down.** Delete the throwaway repo, so dead card URLs don't sit in a public
README and — the one that actually bites — so `/spike/ttl/card-dark.png` doesn't resolve as
owner `spike`, repo `ttl` against the live GitHub API once Milestone 2 ships the real route.
Add `spike` to the reserved-word deny list in Milestone 2 as well; one word, and it holds
whether or not the deletion happened. The screenshots in `docs/spike/` are the durable
record.

### Abandon-or-redesign criteria

| Result | Verdict |
|---|---|
| `<picture>` doesn't switch themes on some surface | Drop dual-theme. One card with its own opaque background. ADR-0003 is superseded. |
| Type illegible at ~390px | Redesign, don't abandon: 3 layers × 4 items, larger nominal type, wider tracking. |
| Rotated labels unsupported or misaligned | Fall back to stacked single-letter labels. Update DESIGN.md's SIGNATURE section. |
| Camo cache unpurgeable beyond ~24h | Acceptable. Cards are near-immutable once embedded; document it in README limitations. |
| Cold render > 8s | Camo will time out. Badge route serves cache-only and 302s to a placeholder on miss; site pre-warms both themes on first resolve. |
| Satori can't express the layout | Redesign the card within Satori's CSS subset (no grid, partial flexbox). Find out now. |

**Do not start Milestone 1 until ADR-0011 exists.**

---

## Milestone 1 — Resolver and stack map v1 · 1 weekend

The real work. Still no UI.

### Steps

1. `lib/github/` — client with the budget counter, recursive tree call, raw fetch at
   pinned SHA.
2. `lib/detect/` — one pure module per manifest type. Table-driven tests as you go.
3. `lib/stack-map/` — ~120 entries with `id`, `display`, `category`, `weight`,
   `description`, `suppresses`. Plus the deny list.
4. `lib/normalize.ts` — deny, drop-unmapped, suppress, version-coerce, rank, slice.
5. Record fixtures from 8 real repos into `tests/fixtures/`, including at least one pnpm
   monorepo, one Go repo, one Python repo, one Rust repo, and one repo with no manifest.
   Include **`vercel/next.js`**: it's the test for GOTCHAS 024's tie-break, since the
   current path order likely gives `packages/next` no slot. Decide the size-based tie-break
   against its real card.
   Include **`Grandbusta/spyde`** — **someone else's repo**, not the author's. Recorded
   API responses only; nothing is ever embedded in it and it is never a deploy target. It earns a slot by differing from the rest of the set on four axes at
   once: a published npm package on `package-lock.json` rather than pnpm, exactly one
   runtime dependency, a docs-site build sitting alongside the library, and both workflows
   and examples in the tree. A one-dependency repo is also the sparsest card the layout has
   to hold without looking broken.

### Definition of done

- `pnpm tsx scripts/resolve.ts vercel/next.js` prints a clean `StackDoc` to stdout.
- Snapshot tests pass across all 8 fixtures with no network in the test run.
- Map integrity test passes.
- Budget test asserts ≤2 API calls.
- **The judgement call:** you look at all 8 outputs and each one is a card you'd be happy
  to have in your own README. If any of them reads as noise, the map is wrong, not the
  code.

---

### Actual cost, against the 1-weekend estimate

**Three calendar days** (2026-09-22 to 09-24), 14 commits, in assisted sessions. As with
Milestone 0, elapsed is not focused hours and the figure does not transfer to a human-only
estimate. Two things are worth carrying forward:

- **The map was not the expensive part.** ADR-0006 predicted the curated data would be the
  work. 223 entries took one pass. The expensive part was everything that only shows up
  when you read a rendered card: versions attached to the wrong package (0018), floors
  printed as facts (0019, 0020), and devDependencies ranked as stack (0021).
- **Four of the five bugs in this milestone were found by reading output, not by tests.**
  Every one of them had passing tests at the time. The judgement call in the DoD was not
  ceremony; it was the highest-yield hour of the milestone.

---

## Milestone 2 — Renderer and routes · 0.75 weekends

### Steps

1. Port the spike's card into `lib/render/card.tsx`, driven by `StackDoc`.
2. `lib/render/error-card.tsx` for all failure paths.
3. `app/[owner]/[repo]/[file]/route.ts` with the reserved-word deny list, and a
   **top-level catch**. `BudgetExceededError` (and any other throw) is a bug: log it on its
   own bug counter, separate from the failure-by-reason counts, then render an error card.
   An uncaught throw would be a 500, which breaks I5. ADR-0012 gets an amendment line for
   the bug counter when the counters are built in M4.
4. `app/api/resolve/route.ts`.
5. `lib/cache.ts` — three key spaces, negative caching.
   **Also measure resolve latency from the deployed function** on vercel/next.js and
   mastodon/mastodon before trusting the 4s deadline (GOTCHAS 027).
6. Determinism test: render twice, assert byte equality, snapshot the hash.
7. **Gutter-fit test.** For every layer in a rendered card, assert the band's rendered
   height is at least the measured length of its rotated gutter label. ADR-0011 names the
   accent bar, header, footer and padding as coupled to this, but a record does not stop
   anyone — the failure is silent, because the label is absolutely positioned and overlaps
   its neighbour while every overflow check still passes. Measure the label, do not hardcode
   ~103: the number moves with the font, the size and the tracking.

### Definition of done

- Both themed PNGs served from the real URL shape and cached.
- Every failure path from the ARCHITECTURE.md table returns 200 with an error card.
- Determinism test green — **both halves**: a byte-identical rerun *and* a committed
  sha256 per card. See `tests/render-hash.test.ts`.
- Gutter-fit test green, including against the densest fixture.
- ~~Your own repo's badge works in your own README.~~ **Moved to Milestone 4**, where
  step 4 already covers it. It was duplicated here, and it cannot be closed honestly
  while the card's footer advertises `stackshot.ilerioluwa.com` and that domain answers
  nothing. Camo end-to-end is already evidenced by Milestone 0 steps 4–7.

---

## Milestone 3 — The one page · 0.5 weekends

### Steps

1. Input, generate, preview, download PNG, copy `<picture>` markdown.

   **The preview pre-warms for free, but only if it uses the same URL as the snippet.**
   Loading the two card URLs into the preview warms the PNG cache *and* the CDN entry, so
   by the time anyone pastes the snippet into a README the first Camo fetch is already a
   CDN hit. CDN entries are keyed per URL, so this only works if the preview and the
   copied snippet are byte-identical URLs. **Build both from the canonical `owner`/`repo`
   in the resolve response, never from what the user typed** — `Vercel/Next.js` and
   `vercel/next.js` are one repo to us and to GitHub, but two entries to the CDN, and
   warming one while handing out the other warms nothing.
2. Descriptions listed beneath the preview as HTML (this is where ADR-0009's content
   lands).
3. Empty state: a real card for a well-known repo, captioned.
4. Three named error states.
5. Keyboard focus, reduced motion, 360px.

### Definition of done

A stranger can paste a URL and get a working README snippet without reading any
instructions. The page passes the quality floor in `DESIGN.md`. There is exactly one page.

---

## Milestone 4 — Ship · 0.25 weekends

### Steps

1. Per-IP rate limiting on the JSON route, global budget guard on the PNG route.
2. Analytics per ADR-0012: Redis counters (resolve, copy, download, failure-by-reason),
   unmapped-package frequency, the weekly embed-count script, Vercel Web Analytics, and
   `GET /api/stats` behind a secret. Budget: 1 hour. No dashboard.
3. `README.md` finalised with real screenshots and real numbers.
4. Deploy to `stackshot.ilerioluwa.com`, badge in own README. **This absorbs the
   identical item that used to sit in Milestone 2's definition of done** — the duplicate
   is resolved here, and the badge waits for the domain the card's footer names.
5. `GOTCHAS.md` reviewed for writeup material.

### Definition of done

Live, rate-limited, counting, and the author's own repos carry the badge.

---

## Fallback: what gets cut, in order

Decide this now, not at 11pm on the third Sunday.

1. **First cut — the site's description list.** Card ships, descriptions don't render on
   the page. Half a milestone saved.
2. **Second cut — non-JS ecosystems.** Drop Go, Rust, Ruby, PHP detection. Keep JS/TS and
   Python. Map shrinks to ~80 entries.
3. **Third cut — Dockerfile and workflow parsing.** The INFRA layer becomes best-effort
   from package.json signals only (Vercel, Supabase, Prisma).
4. **Fourth cut — this is scope (a).** Single-package JS/TS repos only, stated plainly in
   the UI. Ship it, say so honestly in the README, and move on to the next project.

Cutting to (a) and shipping beats not shipping. This is a warm-up and a distribution
mechanic, not a portfolio centerpiece.

---

## Explicitly not on this roadmap

Accounts, saved cards, custom themes, private repos, comparison mode, an iframe embed, a
public API, a CMS for the map, and a browser extension. If one of these starts to feel
necessary, that feeling is scope creep and the answer is no.
