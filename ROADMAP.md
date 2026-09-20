# ROADMAP.md

## Current state

*Update this at the end of every session. It is the first thing read after a `/clear`, and
it is the only thing that survives one.*

```
Milestone:  0 — the Camo spike
Last done:  nothing yet; repo scaffolded, docs committed
Next:       hardcode a StackDoc and render it twice with satori + resvg
Open:       none
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

1. Hardcode one `StackDoc` for a real repo. No network calls at all.
2. Render it twice (light, dark) with `satori` → `@resvg/resvg-js` → PNG, inside a Next
   route handler on the Node runtime, with a real embedded TTF.
3. Build the full card layout, including **the rotated gutter labels**. That is the piece
   most likely to be unsupported.
4. Deploy to Vercel. Put the `<picture>` block into a real public repo's README.
5. View it on: desktop GitHub light, desktop GitHub dark, GitHub mobile web, GitHub iOS
   app, GitHub Android app. Screenshot every one and commit them to `docs/spike/`.
6. Change the image bytes, redeploy, and time how long until GitHub shows the new version.
   Try a `PURGE` request against the camo URL.
7. Measure cold render time end to end, and the PNG byte size.
8. Log user agents on the image route for a week after embedding. Check whether Camo's
   refetches are recognizable enough to serve as a liveness signal (ADR-0012). If they
   aren't, say so in GOTCHAS and drop the idea.

### Definition of done

All eight steps run, screenshots committed, measurements written into `GOTCHAS.md`, and a
go/no-go recorded as ADR-0011.

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

### Definition of done

- Both themed PNGs served from the real URL shape and cached.
- Every failure path from the ARCHITECTURE.md table returns 200 with an error card.
- Determinism test green.
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
4. Deploy to `stackshot.<your-domain>`, badge in own README.
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
