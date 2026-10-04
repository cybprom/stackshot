# ROADMAP.md

## Current state

*Update this at the end of every session. It is the first thing read after a `/clear`, and
it is the only thing that survives one.*

```
Milestone:  3 COMPLETE and committed. Now on the CARD STYLES direction
            (ADR-0029): the card becomes a choice of styles. Phases 0
            (de-risk), 1 (plumbing), 2 (TILES), 3 (TERMINAL) and 4 ARE
            ALL DONE. PHASE 5 IS ACTIVE AND IS THE LAST PHASE.
P5 PLAN:    ** READ THE "Phase 5" SECTION BELOW, DIRECTLY UNDER THIS
            BLOCK. ** It is the authority on how Phase 5 is built: all
            eight steps in order, the five decisions the author has
            already taken (D1-D5), which step is current, and what the
            phase must leave true. AFTER P4 below stays the authority on
            WHAT THE PAGE CONTAINS; the Phase 5 section owns ORDER AND
            MECHANISM and does not repeat it. Those two together are
            enough to resume with no other context.
            CURRENT STEP: 4, the shared components. Steps 1-3 DONE.
PHASES:     0 de-risk DONE · 1 plumbing DONE · 2 Tiles DONE · 3 Terminal
            DONE · 4 site generator DONE · 5 docs and the page. Nothing
            cut.
            The fallback cut order is spent: every item on it — per-style
            reveals, the Light/Dark toggle, the HTML preview — is built.
AFTER P4:   TWO PAGE DESIGNS, built to be compared live, not one chosen on
            paper. A (Playground) and C (Gallery wall) from
            docs/design/site/. Build them as THIN LAYOUT SHELLS around
            shared components: generator, preview, snippet, technology
            index and footer are identical in both — ONLY THE HERO
            DIFFERS. An env var picks the live layout; ?layout=a and
            ?layout=c preview the other. Once the author chooses, THE
            OTHER IS DELETED — this is a fork with an expiry, not a
            feature. The page is now SPECIFIED, not open: everything below
            is decided, and what is still open says so.
             - C auto-generates cybprom/stackshot ~0.9s after load: the
               panel widens, the sweep runs, the card reveals. That card is
               PREPARED AHEAD OF TIME — warmed at deploy, not merely "from
               cache". A cache can be cold: stack: is 30d, png: is 7d and
               eviction is on, so after an expiry the first visitor would
               wait on GitHub for the one card that must never wait. Under
               reduced motion the page loads already showing it.
             - The preview area animates its height (measure, set explicit
               height, transition). C's panel animates width the same way.
             - C's wall must be taller than the tallest hero: eight
               distinct cards per column, duplicated for the loop, so a
               tall card never opens a gap.
             - Technology index shows 2-3 rows then "Show all N". Search
               and the layer filter are the navigation. No pagination, no
               inner scrolling box.
             - "WHAT STACKSHOT FOUND" STAYS, shared by A and C, below the
               main action. One row per item: the TILE SYMBOL, the full
               name, the version and the one-line description, grouped by
               layer. Two columns on desktop, one on a phone. It is the
               key to the Tiles symbols as much as it is the home of the
               descriptions (ADR-0009) — which is why the symbol leads the
               row rather than decorating it. The section exists today as
               a definition list with no symbol and one column; Phase 5
               rebuilds it rather than inventing it.
             - Tiles previews use the three-row cap, the same allocation
               as the renderer (lib/render/tiles-layout.ts).
             - PHONE LAYOUTS FOR BOTH, per a-playground-phone.dc.html and
               c-gallery-wall-phone.dc.html. On C the panel cannot widen,
               so the card appears inside it under the button. 390px.
            C ONLY:
             - GENERATE, OR A TRY BUTTON, WIDENS THE PANEL to two columns:
               controls left, card right, Copy under the card. Width and
               height both animate. The Try buttons are the second way in,
               so they drive the same transition.
               This is the one place "ONLY THE HERO DIFFERS" needs reading
               carefully: the generator, preview and snippet are the same
               COMPONENTS in both, but C arranges them in two columns and
               moves Copy under the card. Shared parts, different
               placement — so they must not assume their own stacking.
             - TRY BUTTONS: vercel/next.js, pmndrs/zustand,
               cybprom/stackshot.
             - The wall's cards come from a FIXED LIST OF 16 REPOS in
               lib/home.ts, resolved into the committed lib/home-data.json
               by scripts/prepare-home.ts. BUILT in step 3, ADR-0035. The
               homepage makes NO GitHub call on any path. Mini-cards are
               HTML from those docs — no PNGs. The intro card's PNGs are
               rendered at BUILD from the committed doc into public/.
               ADDING A REPO: run the script and READ THE SUMMARY. A
               library's own card never names the library.
            SHARED BY A AND C, beyond the generator:
             - NAV: the logo mark — 2x2 squares in the four layer colours —
               and a GitHub link with the LIVE STAR COUNT. Fetched
               SERVER-SIDE AND CACHED, never from the visitor's browser:
               a per-visitor call would spend a shared quota on a number
               nobody reads twice.
             - "ONE SNIPPET. BOTH THEMES." section.
             - FOOTER: the logo, "Open source. Built by Ilerioluwa.", the
               GitHub link, and "Suggest a technology" pointing at GitHub
               issues.
             - A no-match in the technology index links to GitHub issues —
               the same destination as the footer's suggest link.
             - HEADLINES ARE ARCHIVO 800.
P4 GENERATOR: BUILT, all seven steps. ADR-0032 is the record for all of it.
            app/preview/ holds the plate, the two HTML cards, the
            segmented control and the exhaustive PREVIEW_CARDS map;
            lib/preview.ts holds every number, render-free and tested.
            HOW IT HANGS TOGETHER, so step 6 does not undo any of it:
             - The HTML card lays out at the card's own 1200-unit canvas
               and the plate scales it by w/1200. ONE conversion. Every
               value is a token used at 1:1 — app/preview/ contains no hex
               and no size of its own, and tests/preview.test.ts enforces
               both.
             - ONE MEASUREMENT gives the scale AND the plate's height, so
               step 6's animation already has its number: plateHeight(
               units, scale). Do not add a second measurement.
             - SYSTEM IS ANSWERED IN CSS, never in script: both cards are
               rendered and a media query picks (GOTCHAS 056). A forced
               theme is one card and one inline colour.
             - THE FADE HAS THREE GATES: the PNG decoded, the reveal
               finished, and the height settled. The plate owns all three
               and reports onSettled.
             - THE EASED HEIGHT IS DECIDED AT THE MEASUREMENT, not in CSS:
               the one measure call made when a card changed carries the
               ease, every ResizeObserver call afterwards does not, so a
               window resize snaps. The height must also actually move, or
               a Light/Dark flip reopens the gates. PLATE_HEIGHT_MS is 400
               and has two asserted ceilings — under the shortest reveal
               (520ms) and before the last Tiles row reveals (570ms).
               GOTCHAS 057 is the trap, and PHASE 5 WRITES THIS AGAIN for
               C's panel width.
             - Terminal's cursor is a LOADING indicator, not part of the
               card: it fades before the crossfade so the settled card
               matches the PNG exactly.
            The switcher feeds the snippet and both download links.
            Reveals, timings and the two loading phases came from
            docs/design/directions/preview.dc.html.
P5 DOCS:    DESIGN.md still describes only the Datasheet and needs the
            styles. ADR-0029 already exists and is current. ADR-0032
            is the site's motion and radius authority until that
            rewrite lands.
            ARCHIVO 800 IS DECIDED: headlines are set in it, so Phase 5
            SHIPS Archivo-ExtraBold.ttf in app/layout.tsx beside the
            400/600/700 already loaded (700 was added in P4 for the Tiles
            symbol, which the browser was synthesizing). Add the file when
            the hero is built, not before — an unused face is bundle
            weight. The CARD is unaffected: lib/render/fonts.ts carries
            its own weights and no card step asks for 800.
BLOCKS      A FAILING TILES URL RENDERS THE DATASHEET'S ERROR FRAME —
LAUNCH:     accent bar, 3u ink border, radius 2 — because renderErrorCard
            takes no style and SheetFrame is the only frame it has. TILES
            IS THE DEFAULT AND card-*.png IS PINNED TO IT, so most failing
            embeds in the wild would show a frame from a style the reader
            never asked for. NOT a correctness bug — I5 holds, it is 200
            and an image — which is exactly why it will be invisible until
            someone embeds a broken repo. ADR-0030 has the context.
            FIXED by ADR-0033, Phase 5 step 1. Every style frames its own
            error card; the Datasheet's bytes are unchanged. LAUNCH IS NO
            LONGER BLOCKED by this.
OPEN:       nothing is open, and NO STAND-INS REMAIN. tags-*.png used to
            serve Datasheet bytes; ADR-0034 made it 404. A style earns a
            URL by having a renderer: SERVED_STYLES is the subset of
            CARD_STYLES with one, CARD_STYLE_DEFS is exhaustive over THAT,
            and parseCardFile refuses the rest. Shipping Tags is three
            edits — SERVED_STYLES, CARD_STYLE_DEFS, RENDER_VERSION.
STYLES:     Every SERVED style needs an entry in lib/render/styles.ts —
            that map is exhaustive over SERVED_STYLES, not CARD_STYLES
            (ADR-0034). THERE ARE NO STAND-INS; a style with no renderer
            404s instead of borrowing one. ADDING A RENDERER BUMPS
            RENDER_VERSION, or PNGs cached under that style's key get
            served as the real thing.
            THREE STYLE SETS, each with a reason: CARD_STYLES is what the
            URL grammar knows, SERVED_STYLES what has a renderer,
            LAUNCH_STYLES (lib/preview) what the switcher offers because
            it also has an HTML preview.
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
            RENDER_VERSION IS 4 as of Phase 4 step 2: four text runs state
            their line box in px so the HTML preview lands on the same
            line. No layout moved, hashes regenerated. GOTCHAS 052.
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
Last done:  PHASE 4 STEP 6 — THE ANIMATED HEIGHT, which COMPLETES PHASE
            4. The plate eases its own measured height on a card change
            and snaps it on a resize; the crossfade waits for it. 400ms,
            not the dim's 240, because this one travels: next.js is 859u
            in Tiles against 608u in Terminal, ~230px of plate on a style
            flip. Folded into ADR-0032's existing section, no new ADR.
            GOTCHAS 057. Nothing in the eight compare-styles cases moved.
            Before it: PHASE 4 STEPS 0-5. The generator is on the
            page and working: switcher, Light/Dark/System toggle, HTML
            preview, loading sequence, crossfade.
            RENDER_VERSION IS 4. Four text runs now state their line box
            in px instead of taking Satori's font default, because a
            ratio can NEVER agree across the two engines — Satori rounds
            every line box and a browser keeps the fraction (GOTCHAS 052).
            No layout moved; the hashes are regenerated.
            card/owner and card/meta therefore render at 26 and 18, not
            DESIGN's 1.2. That is what they have always done; correcting
            the card to the table is a separate bump and belongs with the
            Phase 5 DESIGN rewrite.
            THREE BUGS CAME FROM THE AUTHOR LOOKING, none from a test:
            a theme flash on load (GOTCHAS 056), Terminal's metadata 46
            units out on a wrapped name (GOTCHAS 055), and the comparison
            sheet silently drawing in Helvetica, which invalidated an
            hour of measurements and a GOTCHAS entry (053).
            scripts/compare-styles.ts is the instrument: every style's
            preview beside its PNG with a difference overlay, fonts and
            images inlined so no browser can refuse them. RUN IT AFTER
            ANY CHANGE TO A CARD OR A PREVIEW. `--panes` writes one pane
            per file for headless screenshots; ?w=2400 reads them at
            native resolution, ?measure=1 prints the HTML's geometry in
            card units for --dump-dom.
            Heights agree to the unit on all eight cases, including the
            100-character name. What remains is edge antialiasing only.
            Before it: PHASE 3 — TERMINAL. lib/render/terminal.tsx at
            height "content", ADR-0031 on what styles share, and
            GOTCHAS 051 (the box glyphs are taller than their line box).
Next:       PHASE 5 STEP 1, THE PER-STYLE ERROR FRAME. The plan and the
            decisions are in the Phase 5 section below — work from it,
            not from this line.
M4 CARRIES: the badge in your own README (the domain is live now, so this
            can come forward), the global budget guard, ADR-0012's amendment
            line for the separate bug counter, and monitoring KV bytes —
            ~790 stacks in Tiles alone after the three-row cap and the 7-day
            png: TTL, ~430 if a repo is cached in two styles.
```

---

## Phase 5 — docs and the page · THE LAST PHASE · ACTIVE

**This section is how Phase 5 is built: the eight steps, in order, with the decisions
already taken.** `AFTER P4` in Current state stays the authority on **what the page
contains** and is not repeated here. Where the two overlap, AFTER P4 wins on content, this
section wins on order and mechanism. A fresh session should be able to work from these two
and nothing else.

### Decisions taken 2026-10-02, before step 1 started

Author-decided. Do not re-open them; they were asked and answered.

- **D1 — The error card is ONE CONTENT TREE IN THE REQUESTED STYLE'S FRAME.** Not three
  trees, and not "deliberately one object" either. ADR-0030's own title is "the frame is
  the style" and the whole complaint was the frame: a failing repo has no layers, so the
  content genuinely is one object. `renderErrorCard` takes a `CardStyle`.
- **D2 — THE REASON LABEL GOES UNDER THE HEADER**, as the first line of the body with the
  explanation beneath it. NOT in the bottom row. The bottom row is metadata — legend,
  domain — and the failure is the card's whole message, so it is read first. (Rejected:
  the bottom-row left slot, which was the cheaper option and the wrong one.)
- **D3 — `tags-*.png` 404s until Tags ships.** A style with no renderer is "not a card
  request", like a bad filename, so I5 is not in play. Record it as an ADR line.
- **D4 — COMMIT THE DATA, NOT THE PNGs.** `scripts/prepare-home.ts` writes the StackDocs
  for the fixed repo list plus the star count as ONE SMALL COMMITTED JSON. The wall's
  mini-cards are HTML in the design, so they render straight from that data and need no
  PNGs at all. The intro card's PNG is rendered DURING THE BUILD from the committed doc —
  rendering needs no GitHub, so the build can never fail on GitHub and no binaries land in
  the repo. Refreshing the data is a script run.
- **D5 — The star count is SERVER-CACHED with roughly hourly revalidation, falling back to
  the committed number**, so the page never waits and never calls from the visitor's
  browser.

### The eight steps

1. **THE PER-STYLE ERROR FRAME — DONE.** ADR-0033. The extraction was verified pure
   first — all 30 committed hashes byte-identical — then one deliberate change on top:
   `card/error-detail`, a new type step giving the wrapping detail a 28px line box
   instead of `card/version`'s 1.10. That moves the 6 Datasheet error hashes and no real
   card. 42 hashes. GOTCHAS 058 (satori hangs on a fragment). Cards for all three styles
   in `docs/spike/error-frames/`.
   `renderErrorCard` and `ErrorCard` take `style`. Extract `TilesFrame` and
   `TerminalFrame` out of their card trees into `lib/render/chrome.tsx`, for the same
   reason `SheetFrame` already lives there and is shared with the error card — one
   definition per frame, never two. Per D2 the body is `label` (at `TYPE.gutter`, the
   gutter label's own step, unrotated — same object, placed differently), then `reason`,
   then `detail`. The Datasheet keeps its rotated gutter label and its derived 518; Tiles
   and Terminal are content-height like their real cards.
   - **NO `RENDER_VERSION` BUMP.** Error cards are never stored under a `png:` key —
     `lib/serve-card.ts`'s `errorCard` renders and returns without `setPng` — so nothing
     cached is at stake. This is the one card change in the project that does not bump.
   - **The five SHEET error hashes must come back BYTE-IDENTICAL.** That is what proves
     the frame extraction was pure rather than a quiet redesign. Tiles and Terminal error
     entries are added to `render-hashes.json`.
   - `tests/fit.test.ts` keeps its rotated-label clearance assertion scoped to the frames
     that actually have a gutter.
   - DESIGN's "the card's gutter labels are the only all-caps in the project" needs an
     amendment line: a gutter-less frame carries the same signage in its body.
2. **THE `tags-*.png` 404 — DONE.** ADR-0034. Done in `parseCardFile` rather than the
   route: a style with no renderer is refused exactly as an unknown name is, so the route
   needed no change and I5 is not in play — it is not a card request. The stand-in is
   deleted rather than flagged, and the type system found all nine places that had assumed
   Tags was renderable. No `RENDER_VERSION` bump: nothing that renders changed.
3. **THE PREPARE-HOME DATA STEP — DONE.** ADR-0035. `scripts/prepare-home.ts` resolves
   the 16-repo list and writes `lib/home-data.json` (docs + star count + generatedAt),
   committed. `scripts/check-home.ts` runs before `next build`: schema drift and a missing
   doc FAIL, age PRINTS and warns past 30 days. `scripts/render-intro.ts` writes the four
   intro PNGs into `public/` at build, gitignored. `StackDocSchema` moved to
   `lib/stack-doc.ts`, shared with `lib/cache.ts`.
   THE CURATION RULE, learned by looking: **a library's card never names the library**,
   because Stackshot reads dependencies and a repo does not depend on itself. react
   rendered `frontend: Zod`, tailwindcss had no frontend layer, django was 3 cells and one
   was Biome. All three cut for applications. tests/home.test.ts asserts a 6-tile floor.
4. **The shared components. ← CURRENT STEP.** Nav (the 2×2 layer-colour logo mark, GitHub link with D5's
   star count), the snippet block, "One snippet. Both themes.", the rebuilt "What
   Stackshot found", the technology index, the footer. The generator and plate are done
   (Phase 4). Two of these are REBUILDS, not inventions:
   - *What Stackshot found* — symbol first, then name, version, description, grouped by
     layer, two columns on desktop and one on a phone. Exists today as a one-column
     definition list with no symbol in `app/stack-form.tsx`. `symbol` is already on
     `StackItem`, so there is no plumbing to do.
   - *Technology index* — every `STACK_MAP` entry (223), 2–3 rows then "Show all N",
     search and the layer filter as the navigation, a no-match linking to GitHub issues.
     Server-rendered from the map, filtered on the client.
   - **Archivo-ExtraBold ships HERE**, with the hero that uses it, not before.
5. **The two layout shells.** A and C as thin shells around step 4, ONLY THE HERO
   DIFFERING. An env var picks the live one; `?layout=a` and `?layout=c` preview the other.
   C additionally: the panel widens to two columns on Generate or a Try button, with WIDTH
   AND HEIGHT both animating — that is **GOTCHAS 057 again with `width` substituted**,
   which is why it was written down. Plus C's intro auto-generate at ~0.9s and the wall.
6. **Phone, both layouts, 390px.** On C the panel cannot widen, so the card appears inside
   it under the button.
7. **Choose one layout and DELETE THE OTHER.** A fork with an expiry, not a feature.
8. **The DESIGN.md rewrite.** It still describes only the Datasheet. ADR-0032 is the
   site's motion and radius authority until this lands. This is also where `card/owner` and
   `card/meta` are corrected to the table at 26 and 18 — **the only `RENDER_VERSION` bump
   in Phase 5**, and it regenerates the hashes in the same commit.

### What Phase 5 must leave true

- No failing embed shows a frame from a style nobody asked for.
- No URL under `/{owner}/{repo}/` lies about what it serves.
- The homepage makes no GitHub call on any path — cold cache, evicted key or GitHub
  outage included.
- DESIGN.md describes every style that ships, and one page exists, not two.

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
