# ROADMAP.md

## Current state

*Update this at the end of every session. It is the first thing read after a `/clear`, and
it is the only thing that survives one.*

```
Milestone:  1 — resolver and stack map (Milestone 0 complete, tagged m0-spike)
Last done:  MILESTONE 0 COMPLETE and torn down. Seven steps, ADR-0011 records GO.
            Rotated gutter works; <picture> switches on all five surfaces both
            themes; Camo honours our max-age (v1->v2 at t+246s) and PURGE works;
            cold render 2.39s vs 8s; card legible at 8.75px item size on a phone.
            Evidence in docs/spike/. GOTCHAS 004, 008, 011-022. ADRs 0011, 0013.
            Teardown done in-repo: crude renderer, spike scripts and the spike/*
            route pins are gone. lib/spike-doc*.ts and scripts/assert-fits.tsx
            deliberately REMAIN until M2 — the route has no other StackDoc source
            and no error card yet. See ADR-0011's teardown section.
Next:       Milestone 1 step 1 — lib/github/ client with the budget counter,
            recursive tree call, raw fetch at pinned SHA. Commit at the end of
            EVERY step from here, not the end of the milestone.
Open:       Detection is entirely unproven — the spike rendered hardcoded data.
            M1's judgement call (do 8 real repos produce cards worth looking at?)
            is the largest remaining risk in the project.
            Rule ladder still compresses on phones: 5u and 3u land at 1.46/0.88px.
            Accepted, not solved. No ladder on 1200 units fixes it. (022)
            Accent bar / header / footer / padding are coupled to the gutter label:
            ~71u of chrome headroom before FRONTEND overlaps, silently. M2 step 7
            is the test that enforces it. (021, 004)
            M2 sets the whole cache chain, not max-age alone — our edge s-maxage
            dominates staleness, not Camo. (0013)
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

## Milestone 2 — Renderer and routes · 0.75 weekends

### Steps

1. Port the spike's card into `lib/render/card.tsx`, driven by `StackDoc`.
2. `lib/render/error-card.tsx` for all failure paths.
3. `app/[owner]/[repo]/[file]/route.ts` with the reserved-word deny list.
4. `app/api/resolve/route.ts`.
5. `lib/cache.ts` — three key spaces, negative caching, `asOf` assignment on first write.
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
