# ROADMAP.md

## Current state

*Update this at the end of every session. It is the first thing read after a `/clear`, and
it is the only thing that survives one.*

```
Milestone:  2 — renderer and routes (Milestone 1 complete)
Deployed:   PRODUCTION IS LIVE at https://stackshot-one.vercel.app (project
            "stackshot", org cybproms-projects, region iad1). The custom
            domain is NOT set up yet. vercel link connected the GitHub repo,
            so PUSHES TO MAIN AUTO-DEPLOY PRODUCTION — nothing is pushed yet,
            and a deploy resets the CDN and functions, so don't push while
            measuring. M2's "connect Git" item is done.
            Measure against the stable alias, never the per-deployment URL:
            that one 302s under Deployment Protection (the spike's trap).
            vercel link also wrote VERCEL_OIDC_TOKEN into .env.local; covered
            by the deny rule and gitignored.
Last done:  M2 STEP 5 — deployed latency measured, GOTCHAS 027 has the
            numbers, the margins and three options. See Next.
            M2 STEP 3 — the card route is real. app/[owner]/[repo]/[file]
            resolves, caches and renders; lib/serve-card.ts composes it with
            the client injected, so every row of the failure table is tested
            from fixtures with no network. lib/cache.ts (3 key spaces, Zod on
            read, negative caching, no-op when unconfigured, every failure a
            miss), lib/hash.ts, lib/counters.ts (failure-by-reason + a
            SEPARATE bug counter), lib/env.ts (lazy, NEVER throws) with
            scripts/check-env.ts wired into `pnpm build` so missing config
            fails the deploy instead of every README at once.
            ADR-0025 removed asOf: it recorded when Stackshot first saw a
            stack, not when the repo changed one, so it was wrong on day one
            and reset on the 30d TTL. The pipeline is now stateless and
            StackContent is gone. Footer right is empty on both cards.
            ADR-0026 sets the whole cache chain with an explicit max-age
            (bare `public` = heuristic freshness at Fastly/Camo): success
            3600/86400/swr 7d, error 300/600. Worst-case staleness 25h and
            15m, and the dominant term is our own edge.
            Spike teardown done per ADR-0011: spike-doc*, spike-card,
            assert-fits deleted. Both things ADR-0011 wanted kept were kept —
            worstCaseDoc() is regenerated from STACK_MAP, and the fit check
            moved into tests/fit.test.ts. It had been measuring the card's
            own frame (797/800 for every card) — which GOTCHAS 021 already
            said on 09-21 and nobody acted on; 041 is that follow-through
            failure, not a discovery. It uses onNodeDetected now, with a test
            that it detects a real overflow, and step 7's gutter-fit
            assertion landed with it. Measuring the labels properly corrected
            FRONTEND from ~103 to 110.0 units in three documents; ADR-0011 has
            an evidence-correction note and its 71-unit coupling claim
            survives (it was only ever consistent with 110).
Next:       Milestone 2 step 4 — app/api/resolve/route.ts. Steps 5 and 7 are
            done; step 6 (determinism snapshot) remains.
            AWAITING YOUR DECISION: deadline values. Deployed from iad1,
            NOTHING timed out over 7 consecutive cold resolves of next.js.
            Current 2500/4000 leave 1.82x on the tree call and 1.67x on the
            total. Recommendation is keep them (option A in GOTCHAS 027) and
            split by route at step 4 (option C: card 4s, /api/resolve 10s,
            which makes pre-warming the normal path). Do NOT widen on the
            strength of the Lagos numbers — those were a client artefact.
            When step 4 lands, ADR-0012 also needs its amendment line for the
            bug counter (M4).
Open:       GOTCHAS 038 now has the success card's variable height as its next
            candidate, as its own step: satori takes width-only and derives
            height, but our tree returns 390/750/750 for 1/4/4 layers, which
            does not match the band arithmetic — the root's height:100% has to
            go to auto first. onNodeDetected is the measuring tool, for that
            and for step 7's gutter-fit test.
            rate_limited and unavailable carry the same detail line today.
            Kept separate (different labels, one self-heals); merge to four if
            they are still identical when M3's error states land. (ADR-0024)
            GOTCHAS 038: a one-layer card (github/gitignore) expands one band
            to the whole card and reads as unfinished. Deferred. Four options
            recorded; the author's lean is variable card height with a
            minimum, which touches CARD.height, the <picture> block and I2.
            GOTCHAS 024: nested-pool ordering. All four candidates give
            identical cards on all 9 fixtures, so nothing favours a change;
            today's depth-then-path stands by default, not by evidence.
            Should a repo's own product appear on its card? zustand's doesn't
            say Zustand, spyde's doesn't say spyde. No ordering fixes it: a
            package's own name is never its own dependency.
            GOTCHAS 027: the 4s resolve deadline failed locally on next.js and
            mastodon; measure it from a deployed function in M2 before
            trusting it. Options there include two deadlines, one per route.
            dropWhenDevOnly is a convention claim, pinned in
            tests/stack-map.test.ts. Watch for a real card losing something
            real: unflag it, one line.
            GraphQL is its own 5000-point bucket; cold resolve = 1 core + 1
            GraphQL. /rate_limit body lies (reported 0 used) — M4 guard must read
            response headers (GOTCHAS 025).
            Rule ladder still compresses on phones: 5u and 3u land at 1.46/0.88px.
            Accepted, not solved. No ladder on 1200 units fixes it. (022)
            Accent bar / header / footer / padding are coupled to the gutter label:
            ~71u of chrome headroom before FRONTEND overlaps, silently. M2 step 7
            is the test that enforces it. (021, 004)
            Commit Mono release OTFs crash satori; use the TTFs (015).
            serverExternalPackages needed for satori AND resvg (016).
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
- Determinism test green.
- Gutter-fit test green, including against the densest fixture.
- Your own repo's badge works in your own README.

---

## Milestone 3 — The one page · 0.5 weekends

### Steps

1. Input, generate, preview, download PNG, copy `<picture>` markdown.
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
4. Deploy to `stackshot.ilerioluwa.com`, badge in own README.
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
