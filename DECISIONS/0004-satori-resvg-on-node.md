# ADR-0004: `satori` + `@resvg/resvg-js` directly, on the Node runtime

**Status:** Accepted
**Date:** 2026-09-21

## Context

The brief framed this as "Satori + resvg, or Next.js OG image generation — compare". That
is a false binary: `next/og`'s `ImageResponse` _is_ Satori plus a WASM resvg, wrapped. The
real choice is wrapped-on-edge versus direct-on-Node.

## Options considered

**A — `next/og` `ImageResponse` on the edge runtime.**
Less code, fast cold starts, runs everywhere. But: fonts must be fetched or inlined through
its own mechanism, the Satori version is whatever Next pins, and there is no control over
the rasterization step — specifically no way to render at 2× and downscale.

**B — `satori` + `@resvg/resvg-js` directly, Node runtime.**
Full control of font loading (read from disk at module scope), version control over both
libraries, and control of the resvg zoom factor. Costs: `@resvg/resvg-js` is a native
binary, so edge is off the table, and cold starts are worse.

**C — Headless Chrome screenshots (Puppeteer/Playwright).**
Perfect CSS fidelity, including grid and real font shaping. Also 200MB+ of Chromium, slow
cold starts, and meaningful cost per render. Massive overkill.

**D — `skia-canvas` or node-canvas, laying out text by hand.**
Full control, but hand-computing text layout for a dense multi-column card is strictly
worse than letting Satori's flexbox do it.

## Decision

B. The deciding factor is the **2× render**. This card's smallest type is 16 units in a
1200-unit space, displayed at roughly a quarter scale in a README. Rendering at 2× and
letting the browser downscale is the difference between crisp small type and mush, and
`ImageResponse` does not expose that control.

Edge's advantage is cold-start latency, which is worth nothing here because every response
is CDN-cached and Camo caches it again on top.

## Consequences

- Node runtime only. No edge deployment, ever, for this route.
- Worse cold starts. Must be measured in Milestone 0 against Camo's fetch timeout.
- We own the Satori upgrade path, including its CSS-support changes.
- We are bound by Satori's CSS subset regardless of this choice: **no `display: grid`,
  partial flexbox, limited shadow support, no `calc()`**. The card layout must be pure
  flexbox. Milestone 0 verifies the rotated gutter renders.
- `@resvg/resvg-js` must resolve the right native binary on Vercel's runtime. Verify in
  Milestone 0, not later.
- The public writeup's angle changes from "generating images at the edge" to "designing an
  image that survives GitHub's image proxy", which is the better post anyway.

## What would make us revisit

- Cold render time exceeds Camo's fetch timeout and pre-warming doesn't fix it.
- Satori proves unable to express the card, in which case C becomes worth its weight.
