# GOTCHAS.md

A running log of things that surprised us, bugs that cost more than an hour, and
non-obvious failure modes. Written at the time, not reconstructed afterwards.

This is the raw material for the public writeup. A terse honest entry written the day it
happened is worth more than a polished one written six weeks later.

**Entry format:**

```
## NNN — Short title
**Date:** · **Cost:** ~Nh · **Status:** anticipated | confirmed | resolved | wontfix
**Writeup material:** yes | no

What happened. What we expected instead. Root cause. Fix, or why we're living with it.
```

---

The entries below are **anticipated, not yet confirmed**. They are written in advance
because each one is a known trap, and because it is worth recording what we expected so
the writeup can be honest about which predictions were wrong. Update the status on each
as it is verified or disproved.

---

## 001 — GitHub proxies every README image through Camo
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** yes — this is the spine of the post

GitHub rewrites every image URL in a README to `camo.githubusercontent.com`. Camo fetches
the image once, sanitizes it, caches it, and serves it to every reader from its own
infrastructure.

Consequences we had to design around, none of which are obvious until you know:
- **Your server is never hit by a reader.** No referer, no user agent, no per-view count.
  The "distribution mechanic" produces almost no telemetry. Unmapped-package logs are the
  only real usage signal we get.
- **An image cannot respond to theme.** `prefers-color-scheme` inside an SVG does not
  evaluate against the reader's preference.
- **SVG `@font-face` is stripped.** Custom type in an SVG badge simply does not load.
- **Failures get cached too**, which is why ADR-0007 exists.

## 002 — The `#gh-dark-mode-only` fragment trick is dead
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** yes

Older blog posts describe appending `#gh-dark-mode-only` / `#gh-light-mode-only` to an
image URL to get theme switching. GitHub removed this. The supported mechanism is an HTML
`<picture>` element with `media="(prefers-color-scheme: dark)"` and two separate URLs.

Half the search results on this topic are stale. Trust the current GitHub docs, not blog
posts.

## 003 — Satori cannot load WOFF2
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** minor

Satori accepts TTF, OTF and WOFF. Not WOFF2, which is what most modern font distributions
ship by default. This narrows the realistic typeface options considerably and needs
checking *before* falling in love with a face.

## 004 — Satori implements a CSS subset, not CSS
**Date:** planning · **Cost:** ~0.5h · **Status:** resolved — the feared part was fine
**Writeup material:** yes — a risk that was real, mis-located, and cheap once framed right

No `display: grid`. Partial flexbox. Limited shadow support. No `calc()`. Every element
effectively needs explicit flex behaviour.

The specific risk was `transform: rotate()` on the gutter labels — the signature element of
the whole design, and the thing Milestone 0 verified first.

**Verdict at step 3: it works, and the hard part was never rotation.** `transform:
rotate(-90deg)` is supported. What looked hard was that transforms do not affect layout, so
the label occupies its unrotated box, and `transform-origin` would have to resolve against
a band height that flex computes at render time. On the web you would reach for
`writing-mode: vertical-rl`, which Satori does not support.

The framing was wrong. Rotating about the element's **own centre** inside an absolutely
positioned wrapper that fills the band removes the band height from the problem entirely —
the wrapper centres the child, and a centre-origin rotation keeps it centred at any height.
Verified against bands with deliberately unequal `flexGrow` (3/2/1/2), which is the real
condition once empty layers are omitted. Nothing clipped, nothing misaligned.

What actually needed care, and would have been the real bug:

- `whiteSpace: nowrap` and `flexShrink: 0` on the label. Without them the text wraps inside
  the 72-unit gutter before it is ever rotated, and the result looks like a rotation bug.
- `position: relative` on the band, so the absolute wrapper has something to fill.

**A coupling worth knowing**, measured rather than assumed — rotated label lengths at
`card/gutter` (18u, weight 700, 0.18em tracking):

```
FRONTEND  102.4u      BACKEND  88.6u
TOOLING    94.3u      INFRA    65.9u        band floor: 120u
```

**Corrected 2026-09-25.** These are 5–8% low. Re-measured from satori's own layout pass —
the engine that lays out the real card, rather than the separate script used here:

```
FRONTEND  110.0u      BACKEND  96.0u
TOOLING    96.0u      INFRA    67.0u        band floor: 120u
```

So FRONTEND clears the 120 floor by **10.0 units, not 17.6**. The conclusion below is
unchanged and the margin is thinner than it read. `tests/fit.test.ts` asserts this now
instead of leaving it written down. See ADR-0011's evidence-correction note.

So the band `minHeight` of 120 is now constrained by **two** independent things: two wrapped
lines of `card/item`, and the longest gutter label. FRONTEND clears it by 17.6 units. If a
later redesign shrinks bands — DESIGN.md's own "3 layers × 4 items" fallback would — the
gutter breaks at around 110 and the failure will look like a rotation problem rather than a
budget one. Both variants were rendered side by side to `docs/spike/gutter-comparison.png`;
the stacked-letter fallback also works and has the same length constraint, slightly worse
(TOOLING is 7 letters at 14u line-stepped ≈ 113u).

## 005 — `@resvg/resvg-js` is a native binary, so no edge runtime
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** minor

The route must be `runtime = "nodejs"`. This also means verifying the correct native binary
resolves on Vercel's build, which is a deploy-time failure, not a local one. Check it in
Milestone 0.

## 006 — The recursive Trees API truncates on large repos
**Date:** planning · **Cost:** — · **Status:** resolved by design (2026-09-22)
**Writeup material:** yes

`GET /git/trees/{sha}?recursive=1` returns `truncated: true` and an incomplete file list
for large repos. Our entire detection substrate is that one call.

Fallback: a root-level `/contents` listing, and mark the resulting doc as partial. This
will happen on exactly the kind of famous monorepo people will try first, so it is not a
rare edge case.

**2026-09-22:** the planned fallback was itself wrong. `/contents` would have been a third
API call and broken I6. Call 1 is now a GraphQL query that returns the root tree entries
too (ADR-0014), so a truncated tree gets its root topped up for free, and the doc is marked
partial. Not yet seen on a real truncated repo; the fixture for it is derived.

## 007 — `package.json` contains ranges, not versions
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** yes — good concrete detail for the post

`"^15.1.0"` is a constraint, not a fact. Printing it raw produces a card reading
"Next.js ^15.1.0", which looks like a bug. Also present in the wild: `workspace:*`,
`latest`, `*`, `github:owner/repo#branch`, and `file:../local`.

See ADR-0008. The cache benefit of major-only versions was not the reason for the
decision, but it turned out to be significant.

## 008 — Camo's cache TTL is undocumented
**Date:** planning · **Cost:** — · **Status:** anticipated — **must be measured**
**Writeup material:** yes — this measurement is the most quotable thing in the post

Nobody publishes how long Camo holds an image. Milestone 0 must measure it empirically:
change the bytes, redeploy, and time until GitHub shows the new version. Also try a `PURGE`
request against the camo URL.

If the answer is long, embedded cards are effectively immutable and that becomes a
documented limitation rather than a bug.

**Record the `cache-control` header alongside the timing.** A TTL number quoted without the
header that produced it is meaningless, and the writeup will be tempted to quote it bare.
The measurement runs against `public, max-age=300` downstream (see 019), chosen so the
result is unambiguous: ~5 minutes means Camo honoured the header, hours means it applied
its own policy. Polling is every minute for the first 15, then every 15 minutes.

**Measured, 2026-09-21. Camo honours `max-age`. There is no fixed Camo TTL to discover.**

Header in force: `cache-control: public, max-age=300`. Camo returns that header verbatim to
the reader — it passes ours through rather than substituting its own.

```
t+0s     light v1  age=102  x-cache=HIT
t+62s    light v1  age=163  x-cache=HIT
t+123s   light v1  age=225  x-cache=HIT
t+185s   light v1  age=287  x-cache=HIT
t+246s   light V2  age=0    x-cache=MISS     <- refetched
```

`age` tracked wall-clock exactly. The copy was 102s old when the origin changed, so
`max-age=300` put its expiry at t+198; last stale read was t+185 at age 287, first fresh
read t+246. Dark behaved identically. **Propagation delay is the remaining TTL of whatever
Camo already holds, and nothing else.**

Two structural notes the timing alone does not show. There is a **Fastly layer in front of
Camo** (`x-served-by: cache-par-…`, `x-cache`, `x-cache-hits`), so the chain is origin →
Vercel edge → Fastly → Camo → browser: four caches, not the two the planning assumed. And
requests spread across *nodes within one POP*, each with its own cache — consecutive fetches
land on different ones, which is why a naive before/after probe reads `MISS/age=0` both
times and proves nothing.

**`PURGE` works.** Measured properly, by first warming a single node:

```
before   x-cache=HIT   age=27
PURGE -> { "status": "ok", "id": "1960022-…" }
after    x-cache=MISS  age=0    then HIT age=1, 1, 2, 2
```

The age counter reset from 27 to 0. So the planning assumption is wrong in the good
direction: **embedded cards are not immutable.** Staleness is bounded by a header we
control, with an out-of-band purge available on top. See ADR-0013.

## 009 — `/{owner}` at the route root collides with the site
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** no

A root-level dynamic segment swallows every future site route. Mitigated by a reserved-word
deny list and by keeping the site to exactly `/` and `/api/*`. Worth knowing that the fix
after launch is expensive, because badge URLs are already embedded in other people's
repos and cannot be changed.

## 010 — `raw.githubusercontent.com` is undocumented territory
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** yes

Fetching manifest contents from raw rather than the blobs API cuts per-resolve REST usage
from up to 8 calls to 2, because raw does not consume the REST rate limit. This is a large
win and it is the reason a plain PAT is sufficient.

It is also not a documented API with a published quota. It could throttle without notice.
The `/git/blobs` fallback must be built in Milestone 1, not deferred.

**2026-09-22, confirmed and extended.** Ten raw fetches **with** the PAT moved the `core`
`x-ratelimit-used` by zero, and raw responses carry no rate-limit headers at all. So
`lib/github/client.ts` sends the token to raw. That's worth doing because unauthenticated
raw is limited per IP, and Vercel's egress IPs are shared with every other tenant. The
client fixes the raw host itself, so the token can't be sent anywhere else. The blob
fallback is built and tested (throttled, timed out, and past-deadline cases).

## 011 — The GitHub apps may not honour `<picture>`
**Date:** planning · **Cost:** — · **Status:** resolved for iOS · **Android untested**
**Writeup material:** yes

Desktop GitHub supports `<picture>` with `prefers-color-scheme`. Whether the iOS and
Android apps render it, and whether they evaluate it against the OS preference or the
app's own theme setting, is unverified. This is a Milestone 0 acceptance item.

**Verdict at step 5: it switches correctly everywhere tested, including the iOS app.**

| Surface | Light | Dark |
|---|---|---|
| Desktop web | ✓ | ✓ |
| Mobile web (Safari) | ✓ | ✓ |
| **GitHub iOS app** | ✓ | ✓ |
| **GitHub Android app** | ✓ | ✓ |

**All five surfaces, both themes each. No failures.** The two app renderers were the
substantive risk — native markdown renderers rather than browsers, and separate codebases
from each other, so iOS passing did not imply Android. Both honour `<picture>` and both
follow the device theme. ADR-0003 stands; the abandon-or-redesign row for "`<picture>`
doesn't switch on some surface" is not triggered.

**A method note worth keeping.** The plan called for one screenshot per surface. What was
actually captured was *both themes on every surface*, and that is the better experiment: a
single screenshot only shows which card rendered, not that the selection responds to
anything. Proving a switch requires seeing it switch. Evidence in `docs/spike/step5-*.png`.

One nuance still unverified on every surface: whether the apps evaluate the **OS** colour
preference or their own in-app theme setting. The two were not varied independently. Low
stakes — the README limitation stands either way — but it is not proven.

There is also a known mismatch even on desktop: `<picture>` evaluates the **OS** colour
preference, not the user's **GitHub** theme setting. A user with a light OS and a dark
GitHub theme sees the light card. Nothing can be done about it; state it in the README.

## 012 — The rule-weight hierarchy was subpixel at display size
**Date:** 2026-09-21 · **Cost:** ~0h, caught in review · **Status:** confirmed
**Writeup material:** yes — the best "the numbers looked fine" example we have

DESIGN.md encodes layer hierarchy in rule weight rather than color, on purpose: four hues
for four categories was rejected as the thing every diagram tool does (self-critique #2).
The ladder was `3 · 2 · 1 · 1` units.

The card is 1200 units wide and displays at roughly 600px in a README. That is **0.5px per
unit**, and 0.33 at GitHub's mobile width of ~390px. So the ladder rendered at 1.5 / 1 /
0.5 / 0.5px on desktop, and the bottom two rungs — the ones distinguishing INFRA from
TOOLING — were the same line. The entire hierarchy system collapsed into "some lines".

The trap is that every number looked reasonable in the 1200-unit coordinate space. Nothing
is wrong until you multiply by the display ratio, and that ratio lives in a different
section of the doc from the values.

Fix: a floor of **3 units for any line that carries information**, ladder to `8 · 5 · 3 ·
3`, card border 1 → 3. Decorative `rule` hairlines stay thin — they encode nothing, so
subpixel costs nothing.

**The knock-on, which is the more interesting half.** Thickening the rules added 12 units
of overhead to a vertical budget that already had under 5 units of slack:

```
padding 64 + header 140 + footer 56 + separators 19 + border 6 + accent 4 = 289
750 − 289 = 461 across four bands = 115 each, against a minHeight of 120
```

Four bands is the common case, so the card overflowed by default. Band `minHeight` is
content-derived (two wrapped lines of `card/item` plus padding = 114) so it could not
absorb it, and the footer could only give back 8. Canvas went 750 → **800**.

One fix exposing a second latent defect, neither of which would have appeared until a
four-band card actually rendered — and by then it would have looked like a rendering bug
rather than an arithmetic one. Both were found with a calculator before any code existed.

## 013 — Camo liveness can't be measured before you have real embeds
**Date:** 2026-09-21 · **Cost:** — · **Status:** deferred
**Writeup material:** yes — a measurement plan that dissolved on contact

ADR-0012 proposed logging user agents on the image route during the spike, on the theory
that Camo's refetches on cache expiry might serve as a *liveness* signal — not a view
count, but evidence a card is still embedded somewhere.

It cannot be tested in Milestone 0. Camo refetches when its cache expires under traffic,
and a spike embed lives in a throwaway repo nobody visits, so there is no traffic to
trigger a refetch and nothing to recognize a pattern in. Borrowing a busy repo would
measure that repo's traffic, not the mechanism.

Deferred to roughly two weeks post-launch, once our own cards are embedded in real READMEs.
It stays an ADR-0012 input; it is not a Milestone 0 go/no-go item, and Milestone 0 drops
from eight steps to seven because of it.

The general shape, worth keeping: **some measurements need a population before they mean
anything, and no amount of care in the instrument substitutes for one.**

## 014 — The type scale had the same subpixel defect as the rule ladder
**Date:** 2026-09-21 · **Cost:** ~0h, caught during the font audit · **Status:** confirmed
**Writeup material:** yes — 012's sibling, and the pair is the better story

DESIGN.md's card scale specified Commit Mono at 400, 500 and 600: `card/item` at 500,
`card/gutter` at 600, everything else 400. Three weights, a considered ladder.

Two things were wrong with it, and only one was the one we went looking for.

**The one we expected.** Commit Mono's release ships 400 and 700. There is no 500 or 700-
adjacent middle; the 25-step weights (200…700) exist only as source files in the upstream
repo. Satori does not synthesize weights — it uses whatever weight you declare for a file —
so asking for 500 with only 400 registered silently renders 400. Three type steps would
have collapsed into one with no error anywhere.

**The one that mattered more.** Even with all three weights available — they load fine and
Satori does render them distinctly, we checked — adjacent mono weights are invisible at
this card's display ratio. Same arithmetic as 012: 1200 units shown at ~600px is 0.5px per
unit, and the stroke difference between mono 400 and 500 on a 30-unit glyph does not
survive that. It is a distinction that exists in the source and not on the screen.

Fix: **fewer steps, not different ones.** `card/item` 500 → 400, `card/gutter` 600 → 700,
two faces total. The gutter labels were never relying on weight anyway — rotation, position,
0.18em tracking and being the only all-caps on the card are four separate signals already,
and weight was the fifth.

The general shape, which is the half worth writing up: **a spec can be internally coherent
and still describe distinctions the medium cannot render.** Both defects were found with a
calculator, one section apart, and both fixes removed something rather than adding it.

Open risk carried to step 7: `card/item` and `card/version` are now the same weight, so
name-versus-version rests entirely on `ink` / `ink-muted`. If that reads weak on the real
card, `card/item` goes to 700 and versions stay at 400 — still two weights.

## 015 — Commit Mono's release OTFs crash Satori; the TTFs in the same zip are fine
**Date:** 2026-09-21 · **Cost:** ~0.5h · **Status:** resolved
**Writeup material:** yes — short, concrete, the kind of thing nobody documents

`CommitMono-1.143.zip` contains OTFs at the top level and TTFs in a `ttfautohint/`
subdirectory. Loading a release **OTF** into Satori 0.33.4 throws:

```
ltagTable is not defined
```

The release OTFs carry an `ltag` table (a Apple-style language-tag table). Satori's font
parsing is opentype.js-derived and references `ltagTable` in a scope where it isn't
defined, so the parse dies before any rendering happens. The TTFs in the same archive have
no `ltag` table and load without complaint, as do the upstream repo's source OTFs and both
Archivo TTFs.

The trap is that the OTFs are the obvious choice — top level of the zip, and OTF is the
more "professional-sounding" format. The working files are one directory down under a name
that reads like a build artifact.

Fix: ship `ttfautohint/CommitMono-400-Regular.ttf` and `-700-Regular.ttf`. Recorded here
rather than worked around, because the error message names an internal variable and
nothing else, and the next person to hit it will search for exactly that string.

Also worth knowing for GOTCHAS 003's neighbourhood: this is a second format trap in the
same area. 003 says Satori cannot load WOFF2. This says it cannot load *these* OTFs either.
"Satori accepts TTF, OTF and WOFF" is true as a statement about formats and insufficient as
a statement about files.

## 016 — The resvg failure was the bundler, not pnpm — and CLAUDE.md predicted the wrong fix
**Date:** 2026-09-21 · **Cost:** ~0.5h · **Status:** resolved
**Writeup material:** yes — a correct prediction pointed at the wrong cause

`CLAUDE.md` warned that pnpm's strict linking would trip `@resvg/resvg-js` because it is a
native binary, and pre-authorized `node-linker=hoisted` in `.npmrc` as the escape hatch.
The package did fail. The diagnosis was wrong and the escape hatch would not have helped.

Under pnpm, resolution worked fine: a plain `node` import and a `tsx` script both loaded
resvg and rendered a PNG on the first try. It broke only inside a Next route handler:

```
Error: could not resolve "@resvg/resvg-js-darwin-arm64" into a module
Aborted(ENOENT: ... '/ROOT/node_modules/.pnpm/harfbuzzjs@0.10.0/node_modules/harfbuzzjs/hb.wasm')
```

Two packages, one cause: **Turbopack bundles route-handler dependencies by default**, and
both ship a non-JS asset that bundling relocates — resvg a platform-specific `.node`
binary, satori a harfbuzz `.wasm`. The `/ROOT/` prefix in the path is the tell: that is a
bundler-rewritten path, not a filesystem one. Nothing to do with the module layout on disk.

Fix is one line in `next.config.ts`:

```ts
serverExternalPackages: ["@resvg/resvg-js", "satori"],
```

Two things worth keeping from this. **Satori needed it too** — the warning named only
resvg, because "native binary" was the mental model and satori looks like pure JS. The
actual predicate is "ships an asset that isn't JavaScript", which catches both. And the
failure is runtime, not build: `tsc`, `eslint` and the dev server's own startup were all
clean, and the route returned 500 only when requested.

`.npmrc` was not touched and `node-linker=hoisted` was not needed. Leaving CLAUDE.md's
warning in place — it pointed at the right package for the wrong reason, and the next
native dependency may genuinely need it.

## 017 — The renderer was byte-identical across two execution paths on the first try
**Date:** 2026-09-21 · **Cost:** — · **Status:** confirmed
**Writeup material:** yes — the one place the architecture paid off immediately

Invariant I2 says the renderer is pure: same `(StackDoc, theme)`, same bytes. The test that
proves it belongs to Milestone 2. It happened to hold on day one, and the evidence is worth
keeping rather than re-deriving later.

The same crude card rendered through two unrelated paths — a `tsx` script calling
`renderToPng` directly, and a Next route handler under Turbopack with `satori` and
`@resvg/resvg-js` marked external — produced identical bytes. Not similar sizes, identical
sha256.

Baselines from the crude renderer, Satori 0.33.4 + resvg-js 2.6.2, 2× zoom, 2400×1600:

```
crude-light-v1.png  81f24637d56c909ee7220d67830f33ffad35587837a9c6975b75fe3c8addd7e3
crude-light-v2.png  929bf813598d729d2a4a5e9bdda04cd52a6dfa66efa150aa8a693452450e1c43
crude-dark-v1.png   b022c1438c04eb22aa7f7f7ab526dc6ce2c629f52566ce5377eb0dcb09adb829
crude-dark-v2.png   b1e5ae26889e88b7dbece1c84b1be78253dd3eb5e754b4bbc1f5cba202360e84
```

These are the crude card, so they are not the determinism test's snapshot — that one
snapshots the real card from a `StackDoc`. They are the baseline for a narrower question:
whether a toolchain change moved the bytes. If a Satori or resvg upgrade, a font swap, or
a bundler setting changes these four hashes, the renderer stopped being the function it
was, and that is worth knowing before it reaches the real card.

Mildly surprising that it held across the bundler boundary at all, given GOTCHAS 016 —
`serverExternalPackages` does not merely make the packages load, it makes them load the
*same* code the script does. Had Turbopack bundled a different build of either library, the
bytes could have diverged while both paths still "worked".

## 018 — Per-deployment Vercel URLs are auth-walled, and the failure is indistinguishable from a `<picture>` bug
**Date:** 2026-09-21 · **Cost:** — · **Status:** resolved
**Writeup material:** yes — a trap with a genuinely misleading symptom

Every Vercel deploy produces a unique per-deployment URL
(`stackshot-spike-ow9h63pfh-cybproms-projects.vercel.app`). The CLI prints it, so it is the
obvious thing to paste into a README. It is the wrong thing, for two independent reasons.

**It is behind Deployment Protection.** Measured: a plain unauthenticated `curl` of a
per-deployment image URL returns **302** to an authentication page. The stable production
alias returns **200 `image/png`**. Camo would fetch the 302, cache whatever it got, and the
README would show a broken or blank image — which looks *exactly* like `<picture>` failing
to switch themes, the very thing step 5 exists to test. A wrong answer to the milestone's
central question, from a URL that looks fine in a browser where you are already logged in.

**It changes every deploy.** Step 6 times how long Camo holds an image. A per-deployment
URL is a new URL each time, so Camo would get a fresh cache entry on every deploy and the
measurement would return "instant" forever, which is both wrong and plausible-looking.

Rule: **only the stable production domain is ever embedded.** And before embedding, `curl`
every image URL unauthenticated — that is what Camo sees, and a browser tab is not, because
the browser carries a session the proxy does not. All six were verified 200 `image/png`
before the `<picture>` block went anywhere.

## 019 — Vercel consumes `s-maxage` and forwards bare `public`, so Camo got no TTL at all
**Date:** 2026-09-21 · **Cost:** ~0.5h · **Status:** resolved
**Writeup material:** yes

The route set what ARCHITECTURE.md specifies:

```
cache-control: public, s-maxage=86400, stale-while-revalidate=604800
```

What production actually returned to an unauthenticated client was:

```
cache-control: public
```

Vercel's CDN consumes `s-maxage` and `stale-while-revalidate` — correctly, they are
shared-cache directives, and edge caching demonstrably worked (`x-vercel-cache` flipped
HIT/MISS as expected). But it forwards the remainder verbatim, and the remainder was the
single word `public`. **No `max-age` reached Camo**, which leaves it to heuristic freshness.

This is a bug regardless of what you want the TTL to be: downstream caching was left
undefined by accident rather than chosen. It is invisible locally, because the dev server
returns the header unmodified — it only appears once something sits in front of the origin.

Fix: an explicit downstream `max-age` alongside the edge directives.

```
public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
```

**300 is chosen for legibility, not performance.** Step 6 measures Camo's TTL, and the value
has to make the result readable. At 3600 an update after roughly an hour has two
explanations — Camo honoured the header, or Camo's own default happens to be about an hour
— and one measurement cannot separate them. No plausible proxy default lands on five
minutes, so ~5 min means honoured and hours means ignored, with no third reading. Camo's
refetches hit the CDN rather than the function, so the short downstream TTL costs
essentially nothing.

Verified emitted on all six paths before embedding, not assumed from the diff.

If step 6 shows the header is honoured, downstream `max-age` becomes a deliberate product
lever for embedded-card staleness and gets an ADR. If it is ignored, it is a README
limitation.

## 020 — Cold render is ~2s, and "cold" was harder to actually produce than to measure
**Date:** 2026-09-21 · **Cost:** — · **Status:** confirmed
**Writeup material:** yes — the threshold was the scary number and it was never close

ROADMAP's abandon-or-redesign table sets 8s as the point where Camo times out and the badge
route has to serve cache-only. Measured on Vercel, crude card, all requests cache-busted so
they reach the function (`x-vercel-cache: MISS` on every one):

```
crude card, immediately after a fresh deploy   2.09s   1.57s   1.29s
crude card, after ~25 minutes idle             1.51s   1.36s   1.52s
real card,  immediately after a fresh deploy   2.39s   1.80s   1.86s
```

Worst observed 2.39s against an 8s threshold. The real-card runs are **method-matched** to
the crude ones — same fresh-deploy procedure, same cache-busted requests — so the ~0.3s
difference is attributable to the layout rather than the environment. That matters because
an earlier set of real-card numbers came in at 1.41–1.61s and looked *better* than the
crude card, purely because the function had been warmed by preceding checks. Comparing
those would have produced the nonsense conclusion that more elements render faster.

PNG size grew with it: ~85KB crude, **127KB light / 130KB dark** for the real card.

**The honest caveat, which is the interesting part.** The post-deploy numbers show a
warming curve (2.09 → 1.57 → 1.29) and the idle numbers do not. So the 25-minute idle test
probably did *not* produce a cold start: either Vercel held the instance longer than that,
or init is fast enough not to show. That means **the strongest cold-start guarantee
available is the post-deploy measurement**, where no warm instance can exist by
construction, and the idle test mostly proves that instances survive 25 minutes of
inactivity.

Worth stating because "we measured a cold start" is the kind of claim that is easy to make
and hard to substantiate. What can be said is: the worst number observed under conditions
that guarantee no warm instance is 2.09s.

A local number would have been useless here for a reason specific to this project —
GOTCHAS 016 moved resvg's `.node` and satori's `.wasm` out of the bundle, and a cold lambda
is exactly where loading those from a cold filesystem would show up. Locally they are
always resident.

## 021 — "maxY=797, 3 units spare" was a misreading of our own assertion
**Date:** 2026-09-21 · **Cost:** ~0.5h · **Status:** resolved
**Writeup material:** yes — a measurement that was correct and reported wrongly

The overflow assertion renders the card and reports the largest y any ink reaches. On an
800-unit canvas it returned `maxY=797` for every case, which got written up as "fits, 3.0
spare" — and then reasoned from, as though the card were three units from disaster.

**It is not a headroom figure.** The card's root is `height: 100%`, so it always fills the
viewport and `maxY` always lands on the bottom border's inner edge. The number can only
exceed 800 when content genuinely spills. It answers "does it overflow", never "by how much
does it clear". Reading slack out of it is reading a boolean as a scalar.

Measured properly, by shrinking the canvas until ink spills:

```
minimum viable canvas (both docs)   659 units
true slack at 800                   141 units
```

So the paper budget's "31 spare" was pessimistic, not optimistic — the opposite of the
worry. Bands carry `flexGrow`, so extra chrome is absorbed by shrinking them rather than by
pushing the footer off the canvas.

**Which means overflow is the wrong thing to guard.** Adding chrome does not overflow; it
compresses bands. Empirically the accent bar renders fine at 8, 16 and even 60 units. The
real constraint is GOTCHAS 004's: the rotated FRONTEND label needs 110 units of band
height, and bands are 127.75 at four layers.

```
available for 4 bands at canvas 800      511   ->  127.75 each
+ 4 units of chrome                             126.75   ok
+56 units                                       113.75   ok
+71 units                                       110.00   gutter label floor
```

**About +71 units of chrome before the gutter label is at risk**, and the failure mode there
is not a clipped card — the label is absolutely positioned and rotated, so it would quietly
overlap the neighbouring band while every overflow check still passed. That is the thing to
assert against, and `assert-fits.tsx` does not currently do it.

Two lessons, and the second is the one worth the writeup. An assertion has to be read as
carefully as it was written — this one was even deliberately verified *able to fail*, and
still got misquoted the moment its output was summarised in prose. And a guard can be
correct and still point at the wrong failure: nothing about this layout was ever going to
fail by overflowing.

## 022 — The card is legible on a phone, but the rule ladder isn't fully rescued there
**Date:** 2026-09-21 · **Cost:** — · **Status:** confirmed
**Writeup material:** yes — the honest ending to the 012 thread

Step 7's re-shoot, real card, all five surfaces. Measured display ratios rather than
assumed ones — the card is 1200 units wide and renders at roughly 1100px on desktop,
~380px on mobile web, ~350px in the apps:

```
                app ~350px      mobile web ~380px    desktop ~1100px
card/item          8.75px            9.50px              27.50px
card/version       6.42px            6.97px              20.17px
card/gutter        5.25px            5.70px              16.50px
card/meta          4.67px            5.07px              14.67px
rule 8u            2.33px            2.53px               7.33px
rule 5u            1.46px            1.58px               4.58px
rule 3u            0.88px            0.95px               2.75px
```

**Verdict: legible. Package names read cleanly at every size**, which is the thing the
abandon-or-redesign row actually tests, so no redesign to 3×4 is needed.

Two honest qualifications, neither fatal:

- **`card/meta` at 4.67px is at the edge.** The footer — domain and `stack as of` date —
  is readable on a phone but only just. It is deliberately the least important text on the
  card, so this is acceptable rather than good.
- **The rule ladder partially collapses again at phone width.** 8u reads as clearly heavier,
  but 5u and 3u land at 1.46px and 0.88px and compress into "thin". The hierarchy reads as
  *one strong rule then three lighter ones* rather than four distinct weights.

That last point is the honest ending to GOTCHAS 012. The fix took the ladder from
*entirely* subpixel to *legible at desktop and partially legible on a phone*. It did not
make four weights distinguishable at 350px, and nothing on a 1200-unit canvas could — 3
units is 0.88px there no matter what ladder you pick. **012's fix was necessary and is not
sufficient at the smallest surface**, which is worth saying plainly rather than letting the
earlier entry imply the problem was solved outright.

**Resolved: the `card/item` / `card/version` weight worry.** Both are Mono 400 and separated
only by `ink` vs `ink-muted` (GOTCHAS 014). At every measured size the versions read as
clearly subordinate without reading as damaged. No need for the `card/item` → 700 fallback.

**Also corrected: DESIGN.md's own rule of thumb was wrong.** It said the card is "displayed
around 600px wide, so effective display size is roughly one quarter of the number". At 600px
the ratio is 0.5 px/unit, so a 30-unit item is 15px, not 7.5px — the heuristic was off by
2×. Measured reality is ~0.92 on desktop and ~0.29–0.32 on phones. Given this project has
now been bitten three times by display-ratio arithmetic, the doc carries the measured
numbers instead of a mnemonic.

## 023 — `/repos` has no commit SHA; the 2-call plan was unbuildable as written
**Date:** 2026-09-22 · **Cost:** ~0.25h, at planning time · **Status:** resolved
**Writeup material:** yes — the plan and ADR-0010 both read fine until you try to write the URL

ARCHITECTURE.md said: call 1 is `GET /repos`, call 2 is the recursive tree, then fetch
manifests from raw "pinned to the resolved SHA". But `/repos` returns the default branch
*name* and no SHA, and the tree call returns a *tree* SHA, which raw won't accept (it wants
a commit-ish). There is no REST pair that gives metadata + a commit + the full tree.

Caught while planning Milestone 1 step 1, before any code. Every doc had been reviewed
and none caught it, because each sentence is true on its own. Fix: call 1 is a single
GraphQL query returning the head commit OID, the tree OID and the root entries
(ADR-0014). Still 2 calls, and it also fixed 006's fallback.

## 024 — Path order hands Next.js's `package.json` slots to everything but `packages/next`
**Date:** 2026-09-22 · **Cost:** ~0.5h across three passes · **Status:** partly resolved; ordering open for step 5
**Writeup material:** yes — each fix exposed the next layer, and the first diagnosis was wrong

"Remaining manifests, shallowest first, ties by path" failed on vercel/next.js in three
separate ways. They look like one problem and aren't:

1. **`examples/` sorts before `packages/` at the same depth**, so four demo apps took the
   slots. Fixed with the denied-segment list (`examples`, `test`, `fixtures`, …).
   `docs/` is deliberately allowed.
2. **`.github/package.json` sorted ahead of every real package**, because `.` precedes
   letters. That's a missing deny rule, not a tie-break problem. Fixed: dot-prefixed
   directories (`.github`, `.devcontainer`, `.changeset`, …) are out of the nested pool.
   Workflows keep their own `.github/workflows/` rule. There's a table case.
3. **Open: depth itself.** After both fixes, next.js at `3204d86` selects `package.json,
   Cargo.toml, a workflow, rspack/Cargo.toml, rspack/package.json,
   apps/bundle-analyzer/package.json`. `rspack/` (depth 2) and `apps/…` beat
   `packages/next/package.json` (depth 3) on depth alone. My earlier "size tie-break at
   equal depth" candidate never reaches `packages/next`, because it only breaks ties
   *within* a depth. **The real question is whether depth should be primary at all.**

**Step 5 compares three orderings against the committed next.js fixture:**
- **depth, then size.** Predicted to fail, for the reason above.
- **size first, across all depths.** The real package tends to have the largest manifest,
  whatever its depth.
- **one per ecosystem, then size.** This also guarantees a nested `go.mod` a slot next to
  a pile of `package.json` files (026).

Blob sizes come free from the tree call, so none of the three costs a request. The small
surprise on the way: in code-unit order, `packages/next-swc/` sorts *before*
`packages/next/`, because `-` (0x2D) < `/` (0x2F). I got that wrong in a test expectation
first.

## 025 — `/rate_limit` reported zero usage while the headers showed it climbing
**Date:** 2026-09-22 · **Cost:** ~0.4h, including the recheck · **Status:** confirmed
**Writeup material:** maybe

The plan was to measure the GraphQL and REST buckets by snapshotting `GET /rate_limit`
before and after. Its body said `used 0` throughout, while the `x-ratelimit-*` headers on
real responses moved as expected.

**Rechecked for a bucket mix-up, and it isn't one.** Each response's
`x-ratelimit-resource` was compared against the matching `/rate_limit` key:

```
REST tree x3      resource=core     used 6 -> 7 -> 8     /rate_limit core.used     0
GraphQL x3        resource=graphql  used 3 -> 4 -> 5     /rate_limit graphql.used  0
/repos, seconds after a /rate_limit call    core used 9  /rate_limit core.used     0
```

- `/rate_limit`'s own response headers also say `core used 0`.
- The response is `cache-control: no-cache` with no ETag, and it still reads 0 with a
  cache-busting query string, so it isn't a cached response.
- The token is a classic PAT with `x-oauth-scopes: ''`.
- The two sources give different `reset` timestamps, as if `/rate_limit` were reporting a
  different or fresh window. That part is not explained.

**Measured, from headers:**
- GraphQL is its own bucket (`x-ratelimit-resource: graphql`, 5000 points, and our query
  costs 1).
- The tree call is `core`.
- A cold resolve is 1 + 1, which roughly doubles ADR-0010's ceiling.

**Consequence for M4:** the global budget guard reads response headers, or
`rateLimit { remaining }` from call 1, never `/rate_limit`. That would be right even if
`/rate_limit` were accurate, because it saves a request.

## 026 — Language manifests were only read at the root, which broke ADR-0001's promise
**Date:** 2026-09-22 · **Cost:** ~0.25h · **Status:** resolved
**Writeup material:** yes — a planning doc contradicting its own ADR, one level down

ARCHITECTURE's selection rule read `pyproject.toml`, `go.mod` and the rest only at the
root, and let only `package.json` in from deeper paths. ADR-0001 says a repo "with a Go
service and a Next app" gets a card showing both. With that rule it couldn't:
`fastapi/full-stack-fastapi-template` has `backend/pyproject.toml` and
`frontend/package.json`, so its card would have shown no Python at all. Caught while
picking step 5's fixtures, when the list itself exposed it. Fix: nested language manifests
join the nested `package.json` pool, with the same depth order and the same deny list.
There's a table case shaped like that repo in `tests/tree.test.ts`. The fairness of that
shared pool is 024's open question.

## 027 — The 4s resolve deadline fails on the repos people will try first, at least from here
**Date:** 2026-09-22 · **Cost:** ~0.3h · **Status:** RESOLVED by ADR-0028 — limits unchanged at 2500/4000
**Writeup material:** yes, if the Vercel numbers tell the same story

Recording fixtures under the production timeouts (2.5s per fetch, 4s deadline) failed on
exactly the repos a stranger would paste first. Timings measured from the recorder, run
from the author's machine in Lagos:

```
                      GraphQL   tree            tree size   entries
vercel/next.js        1.37s     4.03s           12.7 MB     32,826
mastodon/mastodon     1.14s     3.53s            2.6 MB     10,042
astral-sh/uv          1.26s     1.39s            0.5 MB      1,785
github/gitignore      2.76s     1.05s            75 KB        319
raw manifests         0.14–0.82s each
```

So the tree call alone exceeds the whole deadline for next.js here, and GraphQL latency
varies by 2.5× on tiny responses. **These are not production numbers.** Vercel's region
is much closer to GitHub, and the question is what they look like from there. It's open
until M2 can measure it on a deployed function. Options if they are still bad:
- raise the deadline, which eats into the render's share of the 8s estimate
- run the two API calls, then the raw fetches in parallel (the recorder fetches serially;
  `fetchManifest` itself is fine to parallelise)
- on a cold miss for a large repo, serve a "generating" card and warm in the background
- **two deadlines, one per route.** Only the Camo-facing card route needs 4s. The
  site's `POST /api/resolve` has a human waiting and can afford much longer. A successful
  resolve there writes the same KV entries the card route reads, so by the time anyone
  pastes the `<picture>` snippet into a README, the card route is a cache hit. **That makes
  pre-warming the normal path, not the fallback.** The card route's 4s only binds for a
  badge whose cache has expired, or for a URL typed by hand without going through the site.

**Another local data point, 2026-09-22:** `scripts/resolve.ts vercel/next.js`, the full
resolve with parallel manifest fetches, took **5.07s** end to end from here.

Separately, `res.clone()` failed on the 12.7 MB tree body with "Body has already been
read". The recorder now reads the body once and rebuilds the Response. `lib/github` never
clones, so it isn't affected.

**Instrumented baseline, 2026-09-26, still from Lagos** — `scripts/measure-resolve.ts`,
three runs each with the limits lifted, so the true duration is visible rather than
clipped. This is the same measurement the deployed function now logs per request, so the
two are directly comparable.

```
repo                                   total med / max     long pole
Grandbusta/spyde                        1385 /  2449       graphql  997
pmndrs/zustand                          1341 /  1425       graphql  678
fastapi/full-stack-fastapi-template     1590 /  1811       graphql  881
vercel/next.js                          3096 /  3600       tree    2275
```

Two things this settles and one it does not.

**It settles what the long pole is.** For every small repo it is the GraphQL call
(527–1092ms). For next.js it is the recursive tree call, which is the only phase anywhere
near a limit. Raw fetches are cheap and genuinely parallel: six files come back in ~250ms
of wall clock, so the manifest budget is not the problem and never was.

**It settles why the timeouts are intermittent rather than consistent.** next.js sits at
**90% of the 4s deadline and 91% of the 2.5s per-fetch limit** at the same time. There is
no margin on either, so ordinary variance crosses one or the other, and nothing more exotic
is needed to explain it. Note today's tree max of 2275ms against the 4.03s recorded above
on 09-22 — the same call on the same machine, nearly half. The variance between sessions is
larger than the gap to the limit.

**It does not settle the numbers.** Vercel runs in US East, next to both GitHub and (now)
Upstash; these are Lagos numbers over a residential link. Deployed measurement is still the
input the deadline values get chosen from.

---

### Deployed measurement, 2026-09-27 — `stackshot-one.vercel.app`, region `iad1`

Measured against the **stable production alias**, never the per-deployment URL: that one
302s under Deployment Protection, which is the same trap the spike hit. Every request
carries a unique query string the route ignores, so the CDN cannot answer it and each one
reaches the function (`x-vercel-cache: MISS` throughout).

**Server-side resolve, cold cache** — from the route's own phase log, so these are function
time with no client network in them:

```
repo                                  graphql        tree          raw(wall)   total
Grandbusta/spyde                      321–345      145–207          24–151     493–708
pmndrs/zustand                          303          175             284         763
fastapi/full-stack-fastapi-template     377          161             200         745
vercel/next.js    (n=7)   min           435         1140             107        1754
                          median        557         1287             162        2051
                          max           798         1370             401        2394
```

**Phase by phase against the Lagos baseline above**, which is the comparison that matters:

```
vercel/next.js        Lagos median    iad1 median    Lagos max    iad1 max
graphql                    821            557           1092         798
tree                      1753           1287           2275        1370
total                     3096           2051           3600        2394
```

The whole resolve is ~1.5× faster from `iad1`, and **the tree call's worst case improves
1.7×** — the phase that was at 91% of its limit. GraphQL improves least, which says its
latency is mostly GitHub thinking rather than distance, so moving closer buys less there
than the naive model predicted.

**Two kinds of cold, and they are not the same number.** Client-observed from Lagos, so
each includes roughly a second of my own round trip plus a 97–138 KB download:

```
cold function + cold cache   vercel/next.js, fresh deploy, KV cleared     4322 ms
cold function + warm cache   Grandbusta/spyde, fresh deploy, KV warm      2286 ms
warm function + warm cache   same repo, subsequent requests            1149–1664 ms
```

So **cold start costs about 900 ms** and is independent of the resolve. The worst case is
both together, and it is the first number, not the second. The deadline is only about the
cold *cache* column: a cold function with a warm cache never resolves at all.

### Margins against the current limits, and what to set

The current values are `PER_FETCH_MS = 2500` and `RESOLVE_DEADLINE_MS = 4000`.

```
limit                  binds on              worst measured    margin     headroom
PER_FETCH_MS 2500      next.js tree call          1370 ms      1.82×      1130 ms
RESOLVE_DEADLINE 4000  next.js total              2394 ms      1.67×      1606 ms
```

**The Lagos failures were a client-side artefact and must not drive production values.**
Nothing timed out in any deployed run, including seven consecutive cold resolves of the
largest repo in the fixture set.

Three options, with the margin each leaves on `vercel/next.js`:

| | per-fetch / deadline | margin on tree / total | cost |
|---|---|---|---|
| **A — keep** | 2500 / 4000 | 1.82× / 1.67× | none; already proven over 7 cold runs |
| **B — widen** | 3000 / 5000 | 2.19× / 2.09× | a genuinely hung resolve holds the function 1s longer; worst-case function time becomes ~6.8s (5s + ~0.9s render + ~0.9s cold start) against the 8s Camo estimate |
| **C — split by route** | card 4000, `/api/resolve` 10000 | as A for the card | more surface; needs step 4 to exist |

**Decided: A now, C at step 4, not B. See ADR-0028**, which carries the argument and the
revisit trigger. The short version: the Lagos failures were a client-side artefact, and
widening a production limit because a different network was slow is how a limit stops
meaning anything. What reopens it is `timeout` showing up in M4's failure-by-reason
counts — seven runs of one repo in one session is evidence, not proof, and GitHub's
latency varies with its own load.

**Cache round trips are not part of this and should not be confused for it.** Measured
from `iad1` on the warm path: Upstash reads run 4–106ms with a **4ms floor**, which is only
possible same-region and confirms the US East placement. A warm request's entire
server-side cache work is 15–50ms typical against a `CACHE_TIMEOUT_MS` of 500. They also
sit outside the resolve deadline, since the client is constructed after them (GOTCHAS 042).

## 028 — Real Dockerfiles hide the image behind ARGs, and name stages after images
**Date:** 2026-09-22 · **Cost:** ~0.2h · **Status:** resolved
**Writeup material:** yes — the textbook `FROM node:22` never appeared in the fixture set

mastodon's Dockerfile starts `FROM ${BASE_REGISTRY}/node:${NODE_MAJOR_VERSION}-${DEBIAN_VERSION}-slim AS node`.
A `FROM` regex on its own gets `${BASE_REGISTRY}/node` and emits nothing useful. The ARG
defaults are all in the file (`BASE_REGISTRY="docker.io"`, `NODE_MAJOR_VERSION="24"`), so
substituting them before matching turns it into `docker:node@24-trixie-slim`. The same file
then has `FROM ruby AS mastodon`, where `ruby` is an *earlier stage*, not the Docker Hub
image. Stage names are tracked and skipped.

The same pass over real workflows showed that nearly every action is SHA-pinned
(`actions/checkout@de0fac2… # v6.0.2`), so the ref is worthless as a version. It also
showed laravel's `uses: laravel/.github/.github/workflows/…@main`, which is a reusable
workflow, not an action. Both were caught by reading the detector output over the fixture
set before writing assertions, not by the edge-case tables I'd planned.

## 029 — The first map pass against the fixtures found gaps no snapshot could show
**Date:** 2026-09-22 · **Cost:** ~0.3h · **Status:** resolved
**Writeup material:** maybe — "what the card needs" isn't "what the manifests say"

Two gaps, both found by checking each fixture's card-to-be rather than its signal list:

- **Nothing emitted "uses Docker" or "uses GitHub Actions".** DESIGN.md's card shows both
  as items, but the detectors emitted only *which* images and *which* actions. The fact of
  using them was never a signal. Now each Dockerfile, compose file and workflow emits
  `tool:docker` or `tool:github-actions` (ADR-0016). With CI plumbing like
  `actions/checkout` denied, that's the only way GitHub Actions reaches a card at all.
- **spyde's most important item was long tail.** Its only runtime dependency is
  `pdfkit`. A map built from "what most projects use" leaves the sparsest card in the set
  without the one thing the library is *about*. PDFKit and Puppeteer are now mapped.
  That's defensible as head (PDF generation is a common app concern), but the general
  lesson for step 5 stands: a one-dependency repo's one dependency is probably the thing
  that defines it.

## 030 — Confidence 2 said "declared", not "shipped": every devDependency ranked like the stack
**Date:** 2026-09-22 · **Cost:** ~0.4h · **Status:** resolved in the model; applied in step 4
**Writeup material:** yes — Firebase on the Next.js card is a good concrete failure

Found when reading the step-3 coverage output: next.js mapped Firebase, Datadog and Emotion.
They're in its root `devDependencies` because it tests integrations against them. Every
`package.json` signal was confidence 2 and weight is global, so the normalizer had nothing
to rank them out with. Detectors knew the scope all along and threw it away. `RawSignal`
now carries `scope: "runtime" | "dev"`.

Checking the fixtures with scope in hand: **next.js's root `package.json` has zero runtime
dependencies**. Everything is dev, including React. Its card gets "Next.js" at all only
because `apps/bundle-analyzer/package.json` happened to be selected and declares `next` at
runtime. That makes the 024 ordering question more pointed for step 5.

Two known gaps, both defaulting to runtime:
- **Gemfile `group :development, :test do … end` blocks aren't tracked.** mastodon's
  RuboCop and RSpec are therefore runtime-scoped. They map to tooling, which is exempt from
  the dev rule, so today it costs nothing. A test-only gem mapping to backend would be
  misranked.
- **go.mod has no dev/test split at all**, and Cargo `[workspace.dependencies]` is a
  shared list whose real scope depends on which member section references it.

## 031 — `compose.yml` is Compose's canonical name, and selection only knew the legacy one
**Date:** 2026-09-22 · **Cost:** ~0.2h · **Status:** resolved
**Writeup material:** maybe

fastapi's first card showed **PostgreSQL 3**, which is psycopg's version (032), because the
one file that states the real server version was never fetched. The repo ships
`compose.yml` plus `compose.override.yml` and `compose.deploy.yml`. Compose v2 has
preferred `compose.yaml`/`compose.yml` for years. ARCHITECTURE's selection rule, written
from memory, said `docker-compose.yml`. Selection now reads the first of `compose.yaml`,
`compose.yml`, `docker-compose.yaml`, `docker-compose.yml`, which is Compose's own lookup
order. Overrides are ignored. With it, fastapi reads **PostgreSQL 18** and gains Docker.
The fixture-matches-selection test (from 024's fix) flagged the stale fixture straight
away, which is exactly what it was for.

## 032 — Implied entries borrowed their implier's version: "PostgreSQL 3", "AWS 1", "MkDocs 9"
**Date:** 2026-09-22 · **Cost:** ~0.4h · **Status:** resolved
**Writeup material:** yes — the first real cards, and every number on them looked plausible

Drivers-imply-databases (ADR-0016) plus merge-every-signal's-version (ADR-0017) put the
driver's, SDK's or plugin's version on the entry: psycopg 3 → PostgreSQL 3, aws-sdk-core
1 → AWS 1, mkdocs-material 9 → MkDocs 9, react-redux 9 → Redux 9, `@vercel/analytics`
3 → Vercel 3. No test caught it. Each version was parsed correctly, and each is a real
number for something. The error was only visible by reading the cards as a stranger would.
Fix: per-entry `versionFrom` (ADR-0018). The lesson for step 5's judgement pass: read the
versions, not just the names.

## 033 — Four nested-pool orderings, one card: selection moved files, not stacks
**Date:** 2026-09-22 · **Cost:** ~0.6h · **Status:** open — the author reads the cards and picks
**Writeup material:** yes — the ordering question 024 spent three passes on barely matters to the card

`scripts/compare-selection.ts` ran every fixture under today's ordering and four
candidates: (a) depth then size, (b) size first, (c) one per ecosystem then size, (d) a
directory named after the repo first, then a–c. Across 9 repos, **a, b, c and d give the
same card on every fixture.** The only card difference in the whole matrix is next.js,
today versus all four. Why: a monorepo's root already declares the union (workspace
dependencies, root devDependencies), so swapping which nested manifest fills slot 5 rarely
adds a mapped entry.

What the run turned up instead:
- **Selecting `packages/next` removes "Next.js" from the next.js card.** A package's own
  name is never one of its dependencies. Today's "Next.js 16" is an accident:
  `apps/bundle-analyzer` is a Next app. A repo can't appear on its own card by
  dependency, under any ordering.
- **Size-first (b, c) selects vendored code:** `packages/next/src/compiled/@babel/runtime/package.json`
  beats real packages on size. Either ordering needs `compiled` (and likely `dist`) in the
  denied segments.
- **next.js's Firebase and Datadog come from the root devDependencies under every
  ordering**, not from missing `packages/next`. The step-5 premise that 024 would fix them
  doesn't hold on this data.
- **The candidate drop rule never fires on next.js's infra.** It needs a runtime-backed
  entry in the layer, and next.js's infra has none under any ordering, so Firebase and
  Datadog stay. Where it does fire: next.js today loses Tailwind, Emotion, Sass and Express;
  a–d lose Express; fastapi loses Typer (from overflow, invisible). zustand is unchanged
  and keeps React, which is the rule's required outcome.

## 034 — "Node 12" on zustand: a compatibility floor printed as the version
**Date:** 2026-09-23 · **Cost:** ~0.5h · **Status:** resolved
**Writeup material:** yes — the clearest example of a true number that is not the answer

zustand's card said **Node 12**, from `engines.node: ">=12.20.0"`. Nothing else backed it:
its workflow says `node-version: 'lts/*'`. Node 12 is the oldest runtime zustand tolerates,
in a field almost nobody updates; the project runs LTS. uv had the same shape, printing
**Python 3.8** from `requires-python`.

spyde is what made it visible by contrast: `engines.node ">=20"` *and* a workflow pinning
`node-version: 20` — the same "Node 20" on the card, but right. Two cards, same rule, one
correct by coincidence.

Two changes (ADR-0019): a floor never renders alone, and **workflow `with:` inputs are now
read**, which is where the concrete pin usually lives. That second part was a gap, not a
tweak: the detector read `uses:` and images and never looked at `with:`, so a repo pinning
`node-version: 22` in CI and nothing in `engines` had no version at all. Only keys naming a
toolchain are read; the bare `version:` key means the action's own version
(`setup-uv`, `goreleaser-action`) and is skipped. `lts/*` and `${{ matrix.node }}` yield the
tool with no version.

**Cost, paid deliberately:** Python cards lose most versions, because PEP 508 specs are
nearly always `>=x,<y`. fastapi drops FastAPI, Pydantic, Alembic, pytest, Ruff and Python
to bare names.

## 035 — The repo-level guard still empties a layer, on the two cards nobody was watching
**Date:** 2026-09-24 · **Cost:** ~0.2h · **Status:** resolved by reverting the rule (ADR-0022)
**Writeup material:** yes — the guard chosen *because* it can't empty a layer, emptying a layer

ADR-0021 picked the repo-level guard partly because, unlike the unguarded rule, it cannot
strip a layer bare on a library. zustand proved that: no runtime dependency anywhere, so
nothing drops, and React and Redux stay.

It does strip a layer on two repos that *do* ship something:

- **spyde** loses its whole FRONTEND layer. VitePress is a devDependency because it builds
  the docs site, and spyde's one runtime dependency (PDFKit) turns the guard on. The card
  the author had just confirmed as correct now has three layers instead of four.
- **laravel** loses FRONTEND for the same reason: Tailwind sits in devDependencies by
  Laravel convention, and `laravel/framework` turns the guard on.
- uv loses MkDocs the same way, though its frontend layer was only ever a docs generator.

**2026-09-25:** the author checked all three and they are genuinely those projects'
frontends, so the rule was reverted outright (ADR-0022). The keep-the-top-entry exception
was rejected too: it would have restored them by refusing to empty a layer, not by
understanding what they are. See 036 for what the fixtures say actually separates them.

## 036 — What actually separates Tailwind-on-laravel from Firebase-on-next.js
**Date:** 2026-09-25 · **Cost:** ~0.4h · **Status:** resolved by ADR-0023, with the default inverted
**Writeup material:** yes — the answer was a property of the technology, not of the manifest

After ADR-0022 reverted the drop rule, the question was what distinguishes a dev-declared
entry that belongs on the card from one that doesn't. Every dev-only, non-tooling entry in
the nine fixtures — thirteen of them, the whole population:

```
spyde      VitePress                                                    docs/package.json
uv         MkDocs                                                       pyproject.toml
laravel    Tailwind                                                     package.json
fastapi    Typer                                                        pyproject.toml
zustand    React, Redux                                                 package.json
next.js    Tailwind, Sass, Emotion, Express,
           Firebase, Datadog, OpenTelemetry, Vercel                     package.json
mastodon, pocketbase, gitignore                                         (none)
```

**The proposed reading — build-time tools versus integration tests — holds for 11 of 13.**
Stated so the map can carry it: some technologies are *conventionally* declared as dev
dependencies, and their scope says nothing about their role. Tailwind, Sass, VitePress and
MkDocs are never runtime dependencies of anything; being in `devDependencies` is where they
live. Everything else — Firebase, Datadog, OpenTelemetry, Vercel's SDKs, Express, Emotion,
Typer — is normally a runtime dependency, so a dev-only declaration is the unusual case,
and it means a test fixture. That is a property of the technology and belongs in the map.

**The two it does not explain are zustand's React and Redux**, and they are a different
axis: the library case. React is `>=18.0.0` in zustand's **peerDependencies** as well as
its devDependencies; Redux is only a devDependency, and it is there to test the redux
middleware. Peers are exactly the declaration that means "the host runs this", and
`lib/detect/package-json.ts` discards them today by an explicit decision. Reading them
would keep React and drop Redux, which is the right split for that card.

**Caveat the fixtures cannot settle:** Svelte and SvelteKit are conventionally
devDependencies while genuinely being a project's frontend. No fixture contains one —
pocketbase's UI has no Svelte at all, only leaflet and vite — so the convention list has to
be written from knowledge of each ecosystem, not from this fixture set, and it will be
wrong somewhere until real repos test it.

**How ADR-0023 resolved it:** the list went in pointed the other way. Flagging
"normally runtime, so dev-only means test fixture" makes the default *keep*, so the
incomplete list shows noise instead of dropping a layer — and the peer-dependency part of
this analysis was dropped entirely, since unflagged UI frameworks already cover zustand's
React, and optional peers would make a Drizzle-shaped library list every database.

## 037 — The no-network test guard blocked satori itself
**Date:** 2026-09-25 · **Cost:** ~0.2h · **Status:** resolved
**Writeup material:** yes — a guard that was right about the rule and wrong about the mechanism

`tests/setup.ts` replaced `globalThis.fetch` with a throw, so no test could reach the
network. The first render test failed on all 23 cases with "Network access in tests" —
from inside satori. **yoga-layout loads its WASM by fetching a `data:` URI**, so a blanket
fetch guard blocks layout entirely. The guard now allows `data:` and throws on everything
else, and its message includes the URL so the next failure names itself.

Worth knowing for Milestone 2: the renderer really does touch `fetch` at import time, so
any future no-network assertion has to be about hosts, not about the function.

## 038 — A one-layer card is mostly empty space
**Date:** 2026-09-25 · **Cost:** — · **Status:** open, a design question for M2
**Writeup material:** maybe

Rendering all nine fixtures turned up a shape the spike never had: `github/gitignore`
resolves to a single INFRA layer holding `GitHub Actions`. DESIGN.md says empty layers are
omitted and the remaining bands expand, so one layer expands to the full 1200×800 card with
one item floating in the middle of it. It is not broken — the type, rules and gutter label
all read correctly — but it reads as an unfinished card rather than a sparse one.

Options, none applied: cap band growth and leave the remainder as deliberate whitespace;
render a "not much to show" line; or treat a one-layer resolve as a near-empty result and
let M2's error-card path handle it. The fixture is committed, so any of them can be tried
against it.

**Fourth option, and the author's lean rather than a decision (2026-09-25):** let the
card's height follow its content, with a minimum, so a sparse repo gets a shorter card
instead of one item floating in a tall one. It is the largest of the four: `CARD.height` is
fixed at 800 and `renderToPng` hands it to satori, the `<picture>` block and every
committed screenshot assume 1200×800, and a per-doc height becomes part of the render's
input, so the determinism test (I2) has to pin height as well as bytes. **Deferred, not
rejected.**

**The error card went fixed-short instead (2026-09-25, M2 step 2).** Reviewing the ten
error-card renders raised the same complaint on a second surface, and there it was cheap:
an error card's content shape never varies, so it takes a fixed 1200 × 518 —
`ERROR_CARD_HEIGHT`, derived from the chrome and band tokens — and none of the hard parts
above apply. `renderToPng` now takes height as a parameter, which is the mechanism a
variable-height success card would use too. **The success card is the next candidate and
should be its own step, with renders.** Three facts for whoever picks it up, measured
rather than assumed:

- **Satori can derive height itself.** `SatoriOptions` is `{width, height} | {width} |
  {height}`, and width-only returns a content-sized SVG. We do not have to compute the
  height from the band rules by hand.
- **The numbers it returns today are not yet trustworthy, and that is our tree's fault.**
  Width-only on the current `Card` gives 390 units for `github/gitignore` (1 layer) and
  750 for both `pmndrs/zustand` and `mastodon/mastodon` (4 layers). 750 is not
  `130 chrome + 140 header + 19 separators + 4 × 120 minHeight` = 769, and two cards of
  very different density landing on the same number says the bands are not measuring their
  content. The likely cause is the root's `height: "100%"` resolving against nothing,
  plus `flexBasis: 0` on the bands. **The step starts by making the root `auto` and
  re-deriving — not by trusting 390 and 750.**
- **`onNodeDetected` gives measured geometry per node** (`left/top/width/height`, plus
  `textContent`) from satori's own layout pass. That is the two-pass route — measure, then
  render at the derived height — and it is also what M2 step 7's gutter-fit test should
  use instead of the 0.609em advance constant the error-card test assumes today.

Two consequences that do not go away: height becomes part of the render input, so I2's
determinism test has to pin it; and per-repo dimensions mean the embed snippet must not
pin `width`/`height` on the `img`. The error card already forces that second one, because
one URL now serves 1200 × 800 or 1200 × 518 depending on whether the repo resolves.

## 039 — The repo-name ladder never had a bottom, and the error card found it first
**Date:** 2026-09-25 · **Cost:** ~45m · **Status:** fixed
**Writeup material:** yes

The error card echoes a name that came from the URL rather than from a resolve, so it was
the first thing to ask what a 100-character repo name does. It turned out not to be an
error-card question at all. Both cards were broken, in two different ways, and neither
failure is one an overflow check would have caught.

A 97-character hyphenated name at DESIGN's floor of 40 units wraps to **three** lines,
which is 148.8 units in a 140-unit header band. It overflows downward, sits on top of the
8-unit rule, and paints into the first layer band. Same silent class as GOTCHAS 004: the
layout is "correct", it just draws in the wrong place.

The second one is worse and was not on anyone's list. Repo names have no spaces, so a name
with no hyphens or dots has **no break opportunity** and does not wrap at all — 100 `a`s
ran off the right edge of the canvas, past the border, and the header's flex row silently
shortened the rule beside it. `wordBreak: "break-word"` is load-bearing here, not a
nicety.

The fix is a fourth step at 36, `wordBreak`, and a two-line clamp. **`lineClamp` is the
part that cost the time:** satori supports it, but `ac()` in `satori/dist/index.js` gates
it on `display === "block"`, and every element in this codebase is `display: flex` because
that is what satori's own docs push you toward. Setting `lineClamp: 2` on a flex container
does nothing, silently, and the name still renders three lines. Reading the bundled source
was faster than reading the docs.

Two things worth carrying:

- **DESIGN's "never truncate" was written without a worst case in hand.** It is a good rule
  for a 30-character name and an impossible one for a 100-character name. The revised rule
  keeps the spirit and admits the exception; see DESIGN.md's TYPE section.
- **This is the fifth bug in this project found by rendering something and looking at it,
  against zero found by a test.** The probe that found it took four minutes to write.

## 040 — GitHub names are case-insensitive, and our cache keys are not
**Date:** 2026-09-25 · **Cost:** — · **Status:** open, must be closed in M2 step 3
**Writeup material:** maybe

`Vercel/Next.js`, `vercel/next.js` and `VERCEL/NEXT.JS` are the same repo. GitHub resolves
all three, redirects the web UI to the canonical spelling, and the API answers every one of
them. Nothing about that reaches our cache: `repo:{owner}/{repo}` keyed on the URL's
spelling gives each variant its own pointer, so one repo becomes N cold resolves, N stack
hashes and N renders. It also multiplies the abuse surface — the same repo can be asked
for under unlimited spellings, each one a cache miss against a budget the rate-limit guard
assumes is per-repo.

`lib/repo-ref.ts` already accepts every spelling, correctly: rejecting a mixed-case name
would refuse a link a person legitimately copied.

**The fix belongs to step 3, and the key and the display are two different things.** The
temptation is to key everything on the canonical name GraphQL returns, and that is exactly
backwards: **the pointer lookup runs before any API call**, so at lookup time there is no
canonical name to key on. Keyed on canonical, a request for `Vercel/Next.js` misses, calls
GitHub, and spends the budget this entry exists to save.

- **Lookup key: the lowercased request.** `repo:{owner}/{repo}` from the path segments,
  lowercased, and nothing else. Every spelling of a repo hashes to one pointer on the
  first request, with no API call needed to get there.
- **Display: the canonical owner and name from the GraphQL response.** A card reading
  `VERCEL/NEXT.JS` because that is how someone typed the badge URL is wrong. The pointer's
  value carries it, so a cache hit renders the canonical spelling without a call.
- **Renames fall out of this rather than needing a rule.** The old name's lowercased key
  points at the same `stackHash`, and the card shows the current name. Both correct, no
  special case.
- Only the very first request for a repo, in any spelling, pays a cold resolve.

## 041 — The fix for 021 took four days to land, and 021 said exactly where
**Date:** 2026-09-25 · **Cost:** ~20m · **Status:** fixed
**Writeup material:** yes — but as a follow-through failure, not a discovery

Retiring `assert-fits.tsx` at teardown, I printed its numbers rather than its verdict and
found every card scoring `maxY=797` of 800 — a one-item card and the densest fixture
alike, because the lowest ink is always the frame's inner edge.

**This was not a discovery. GOTCHAS 021 recorded it on 2026-09-21**, correctly, in more
detail, with the same 659-unit minimum canvas I then measured again from scratch. It ends
with: *"That is the thing to assert against, and `assert-fits.tsx` does not currently do
it."* Four days and a milestone later, it still did not, and I rediscovered the entry only
after writing this one up as news.

What is actually new here is small: the check now lives in `tests/fit.test.ts`, uses
satori's `onNodeDetected` — absolute geometry per node, from the same layout pass that
draws the card — and is paired with a test that it detects a real overflow, because the
densest fixture on a 600-unit canvas reports 659. The gutter-fit assertion 021 asked for
also exists now, measuring each rotated label and comparing it to its band.

Measuring the labels properly turned up the one genuinely new fact, and it invalidates a
number three documents repeat: **`FRONTEND` is 110.0 units rotated, not ~103.** See the
evidence-correction note in ADR-0011 — the accent-bar coupling conclusion survives, and
is only consistent with the corrected figure.

**Two lessons, and the second is the writeup one.** A guard whose output is a boolean will
report success for years without anyone noticing it stopped measuring; thirty seconds of
printing the intermediate value found it. And an open item written down as prose at the
end of an entry is not a task — 021 named the exact fix, in the file it belonged in, and
that was not enough to make it happen or to stop the same ground being covered twice. The
things this project actually acts on are the ones in `ROADMAP.md`'s Next block.

## 042 — The resolve deadline was already running before the cache was read
**Date:** 2026-09-25 · **Cost:** ~30m · **Status:** fixed, and it exposed a worse one
**Writeup material:** yes

`createGitHubClient` starts the 4s resolve deadline with `AbortSignal.timeout` **at
construction**, not at first use. The route built the client while assembling its
dependencies, before `serve-card` had read anything, so all three Upstash round-trips —
pointer, doc, png — ran inside the resolve's own budget. On a laptop talking to a remote
Redis that is easily several hundred milliseconds of a four-second allowance, spent before
the first GitHub request is even sent.

Fixed by passing a factory rather than a client, so the clock starts immediately before
the resolve that needs it, and never starts at all on a cache hit. The general shape is
worth remembering: **a timeout that begins at construction couples a deadline to
dependency wiring**, which is exactly the code most likely to be rearranged later.

**The fix did not fix the symptom, which is the useful part.** With the deadline correctly
scoped, `pmndrs/zustand` still times out from this network, and so does `vercel/next.js`.
Both resolve fine against fixtures and `zustand` resolved live in ~3.2s earlier in the
same session. So GOTCHAS 027's open question is not a measurement artefact and is not
about cache overhead: **the 4s deadline is genuinely too tight for a real repo on a real
connection**, and the per-fetch 2.5s limit on up to six parallel raw fetches is the more
likely binding constraint. Measuring from a deployed function is M2 step 5 and this is now
evidence for it rather than a hypothesis.

One consequence to weigh there: a timeout is transient, but the route caches it as a
`failed` pointer for ten minutes, so a slow repo is unavailable for ten minutes after one
bad request. The short negative TTL is doing its job, but timeouts may deserve a shorter
one than a genuine 404.

## 043 — `.env.local` holds the production cache, so `next dev` wrote cards strangers would see
**Date:** 2026-09-27 · **Cost:** ~1h including the platform check · **Status:** fixed
**Writeup material:** yes

`.env.local` holds the **production** Upstash credentials, because that is what makes
local development exercise the real cache. The consequence nobody stated out loud: a card
rendered by `next dev` on a laptop is written under the same key production reads. A
half-finished design experiment — a colour being tried, a layout mid-edit — would be
served to anyone whose README embedded that repo's badge, for the 30-day TTL, with no
deploy involved and nothing in the deployment history to explain it.

This was not hypothetical. This session ran `next dev` against these credentials on two
ports while testing the route, and those runs rendered and cached PNGs for `spyde`,
`zustand` and `next.js`.

**The part worth keeping is that the damage was unattributable.** Auditing the ten keys in
production KV, there was no way to tell which had come from a laptop and which from
`iad1`: same key space, same format, no marker. The absence of namespacing does not just
allow the mistake, it destroys the evidence of it. Every key is now prefixed with
`VERCEL_ENV` (`production:`, `preview:`, or `local:` when the variable is absent), across
all three cache spaces and the rate limiter, and the ten unscoped keys were deleted.

Two smaller things fell out of the same hour.

**`png:` needed a version, for the opposite reason.** The key is content-addressed on the
`StackDoc`, and a design change alters none of it — so shipping a new colour would leave
every cached repo serving the old card for 30 days while new repos got the new one. The
key now carries `RENDER_VERSION`, and `tests/render-hash.test.ts` is what forces the bump:
it fails on any byte change and says so in its message. ADR-0005's amendment.

**Rendered output is byte-identical across platforms, which was worth checking rather than
assuming.** `@resvg/resvg-js` ships a per-platform native binary, and font rasterization
is exactly the kind of thing that differs between them. Clearing the `png:` keys and
forcing a fresh render on the deployed Linux x64 function, then rendering the same
`StackDoc` locally on macOS arm64:

```
deployed (linux x64)   99344 bytes  sha 5ec937606f6acbd4…
local    (darwin arm64) 99344 bytes  sha 5ec937606f6acbd4…
```

Identical. So the committed hashes need no authority machine and no CI-on-ubuntu
arrangement, and a developer on any platform gets the same verdict. If that ever changes,
the fallback is recorded in ADR-0005.

## 044 — pnpm 10 gave `pnpm-workspace.yaml` a second job, so presence stopped meaning monorepo
**Date:** 2026-09-28 · **Cost:** ~1.2h · **Status:** fixed
**Writeup material:** yes — found by pointing the tool at its own repo, which no test would have done

Milestone 3 opens by putting a real card in the site's empty state. Rendering this repo's
own card was step one, and it read:

```
TOOLING  pnpm workspaces  Vitest 5  TypeScript 5  ESLint 9
```

Stackshot is a single package. It has never had a workspace.

`lib/detect/paths.ts` treated `pnpm-workspace.yaml` as a monorepo signal by presence
alone, which was true when the file existed only to list `packages:`. **pnpm 10 moved
settings out of `.npmrc` into it** — `ignoredBuiltDependencies`, `onlyBuiltDependencies`
and friends — so ordinary single-package repos now ship one. Ours holds two lines of
build-script config and no `packages:` key at all.

This was never about our repo. **Every pnpm-10 single-package repo that has ever needed a
build-script allowlist was being told it was a monorepo**, on a card someone else was
being invited to embed.

The fix counts `package.json` files instead of trusting the file, and the interesting part
is *which* ones it counts. The obvious version — count every `package.json` in the tree —
walks straight into the trap that GOTCHAS 024 spent three passes on: `pmndrs/zustand` is a
single-package library with `examples/demo/package.json` and `examples/starter/package.json`,
so a naive count says three and the false positive survives. Counting only the paths that
survive `selectManifests`' denied-segment and dot-directory filters says one, and zustand's
card now reads `pnpm 11` where it used to read `pnpm workspaces`. The true fact replaces
the false one, because the workspaces entry had been suppressing plain `pnpm` all along.

The filters had to move to `lib/manifest-paths.ts` to get there: `lib/detect/*` cannot
import `lib/github/*`, and it should not, so the shared thing is a pure path module both
sides import and `DENIED_SEGMENTS` has one definition again instead of being about to have
two. ARCHITECTURE's boundary table gains a row.

Two things this cost beyond the fix:

- **The test helper was narrower than production.** `detect()` gets every tree path from
  `lib/resolve`, but `recordedRootPaths()` fed the tests only call 1's root listing, so
  next.js — a real workspace — looked single-package to the new rule and failed. That gap
  predates this change: nothing nested was reachable in those tests, `supabase/config.toml`
  included. Replaced with `recordedTreePaths()`, which reads call 2's recorded tree.
- **The render-hash test told me to do the wrong thing.** next.js's bytes moved, so it
  failed with "bump RENDER_VERSION". Wrong here: the *renderer* didn't move, the StackDoc
  did, and the `png:` key already carries `stackHash`, so a changed doc lands on a new key
  and nothing stale is served. Bumping would have retired every correct PNG for no reason.
  The other twelve hashes being byte-identical is what confirms it. The message now
  distinguishes the two cases.

Also fixed in the same pass, and the reason the card was thin as well as wrong: `satori`
and `@resvg/resvg-js` were unmapped, so the two libraries the product is built out of were
missing from its own card. `satori` turns out to be a dependency of `vercel/next.js` too,
which is the argument that it belongs in the map on general merit rather than because it is
ours — next.js's unmapped count fell 236 → 235 and its backend layer gained an overflow.

## 045 — `site/label` asked for a weight Commit Mono does not ship
**Date:** 2026-09-28 · **Cost:** ~0.1h · **Status:** fixed
**Writeup material:** minor — but it is the same mistake twice, in one document

DESIGN's site scale listed `site/label` as Mono 500. Commit Mono ships 400 and 700 only,
which the card's own scale table says three sections earlier (GOTCHAS 014). We ship two
TTFs, so 500 would have synthesized or dropped to the fallback stack.

Caught by reading the table before writing the CSS rather than by anything rendering
wrong, which is the point: on the site a missing weight degrades silently into a slightly
different face. Fixed to 400, with the 0.02em tracking carrying the distinction.

## 046 — Tailwind v4's `@theme` ignores the media query it is nested in
**Date:** 2026-09-28 · **Cost:** ~0.4h · **Status:** fixed
**Writeup material:** yes — a wrong thing that renders, which is the expensive kind

The obvious way to write two palettes in Tailwind v4 is the one that fails:

```css
@theme { --color-surface: #EDEEEA; }               /* light */
@media (prefers-color-scheme: dark) {
  @theme { --color-surface: #0E1113; }             /* never conditional */
}
```

`@theme` is resolved at build time. The media query around it is not honoured, so the dark
values simply overwrite the light ones and **every visitor gets the dark palette**, in a
project whose entire premise is that a rendered thing follows the reader's theme.

It survived a passing build, a passing type-check and a passing lint. What caught it was
the first screenshot: the page was dark in a run that had asked Chrome for
`prefers-color-scheme: light` — and, tellingly, the embedded `<picture>` had correctly
chosen the *light* card. The card and its own website disagreed in the same image, which
is the only reason it was obvious.

The working shape is the scaffold's, which we had deleted: raw custom properties on
`:root`, overridden in a normal media query, then re-exported through `@theme inline`.

Two things worth keeping:

- **Verify a theme by emulating it, not by trusting the CSS.** The screenshots are driven
  through CDP's `Emulation.setEmulatedMedia`, so both themes are actually exercised.
  Node 24 ships a global `WebSocket`, so this needs no Playwright and no dependency — which
  matters, because DESIGN bans adding one.
- **`tests/tokens.test.ts` would not have caught this**, and still would not. It asserts
  the CSS *contains* the right ten hexes on the right sides of the media query; it says
  nothing about whether the browser applies them conditionally. A test over static text
  cannot see a build-time directive ignoring its context. The screenshot pass is the check.

## 047 — The style designs ask for three weights we don't ship, and one of them doesn't exist
**Date:** 2026-09-29 · **Cost:** ~0.5h · **Status:** fixed
**Writeup material:** yes — the third time this font's weight set has cost something

The four card styles were drawn in Archivo 500/700 and Commit Mono 600. We ship Archivo
400/600 and Commit Mono 400/700. Every style was affected and nothing would have failed
loudly: Satori picks the nearest face it has, so the cards would simply have rendered in
the wrong weight.

**Commit Mono 600 does not exist at all** — the release carries 400 and 700 only, which is
GOTCHAS 014 for the third time, and the second time a *document* asked for a weight the
font never had (GOTCHAS 045 was the first). Terminal wanted it twice and Datasheet once.
All of them become 700.

Archivo gained a real file. 700 is shipped because the tile symbol is Tiles' signature at
64 units, where 600 reads visibly light. 500 is remapped to 400 rather than shipped,
because tile names are 23 units — the difference is invisible at every ratio we render
for, and a font file is ~190 KB in the deployment for nothing.

`Archivo-Bold.ttf` is Omnibus-Type v2.001, the same version string as the two already
committed. Verified from the bytes before shipping rather than from the download page:
sfnt `0x00010000` (TrueType, not the OTF trap), `usWeightClass` 700, and **no `ltag`
table** — the thing that made the release OTFs unusable in GOTCHAS 015.

Adding a face to `FONTS` could have moved existing output, since it changes what Satori
resolves against. It did not: all 14 committed render hashes came back byte-identical,
because nothing asks for 700 yet. So no `RENDER_VERSION` bump. Worth checking rather than
assuming — a font that *had* shifted the fallback would have silently changed every card.

## 048 — Tiles misses five-across by four units, and the fix was already in the tokens
**Date:** 2026-09-29 · **Cost:** ~0.4h · **Status:** fixed
**Writeup material:** yes — a four-unit number deciding fifteen percent of the card

Doubling the design's values gave a card with **four** tiles per row, not five. Five tiles
need `5×208 + 4×18 = 1112` units; the design's 44-unit padding and 2-unit border leave
1108. Four short.

This is latent in the design file, not a porting error: at its 600px draw the same
arithmetic gives 554 against the 556 five tiles need, so it wraps to four there too. It is
invisible in a design canvas because the tiles simply flow.

The cost is a whole extra row on dense repos. Setting the card's padding to **32** —
which is `CARD.padding`, already used by the Datasheet card, and on DESIGN's 4-unit
spacing scale, where the design's 44 is not — gives five across:

```
vercel/next.js     1523 -> 1289 units   (-15%)
pmndrs/zustand      893 ->  659 units   (-26%)
```

The lesson for the remaining three styles: **"multiply every value by 2" preserves
proportions but not fit.** Anything that wraps, fits, or divides has to be re-derived
against the 1200-unit canvas rather than scaled, and the design's own draw width is not
evidence that it fits, because a design canvas reflows silently where a card cannot.

## 049 — Whoever is allocated first gets the good letters, and the order was arbitrary
**Date:** 2026-09-29 · **Cost:** ~0.9h · **Status:** fixed
**Writeup material:** yes — three orderings, three different sets of wrong answers

Tiles needs a unique two-letter symbol for each of 225 map entries. Two letters give 2704
combinations against 225 entries, so it looks like there is room. There is not: names
cluster on initials — nine begin with P, fourteen with S — and **whoever is allocated
first takes the letters everyone else wanted.**

Three orderings, each producing a different set of indefensible symbols:

```
declaration order   TypeScript -> Tc   ESLint -> Ei    PHPStan -> P0
                    (frontend and backend drained the pool before tooling was reached)

by weight           Python -> Pk       Rust -> Rg      PHP -> Pj
                    (weight ranks WITHIN a layer, and types.ts deliberately depresses
                     languages because "the header already names the primary language")

by weight + anchors  the 19 left over are all genuinely scarce, and none is a language
                     or a household name
```

The second was worse than the first, which is the part worth remembering: a rule that
sounds principled — "allocate by importance" — was reading a field that does not mean what
it appeared to mean. `weight` is documented as a within-layer rank in the line directly
above it, and nothing enforced that reading.

Two anchor groups fixed it. **Languages and runtimes**, whose low weight is a card-ranking
decision with nothing to do with symbols. And **the designer's own 26 picks**, which were
sitting in `docs/design/directions/tiles.dc.html` the whole time: the ladder had given
Tailwind `Ti` and webpack `We` while `Tw` and `Wp` sat unclaimed, because it takes the
first available letter in name order rather than the idiomatic one. A hand-lettered tile
in a design file is a decision, and it beat three generations of heuristic.

What remains is honest scarcity — nineteen entries on crowded initials — and the generator
reports **who holds the letter each one wanted**, because the reviewer's real choice is a
trade rather than an invention. `P` and `S` turned out to be fully saturated, all 26
combinations of each taken, so on those initials there is no such thing as an improvement
that costs nothing.

The review added a third anchor the generator could not have known about: **every symbol on
Stackshot's own card**, because Site C generates that card on load and it is the first one
any visitor sees. Satori had `Sb`, which reads as Supabase or Storybook, and took `Sr` with
Starlette yielding — decided on what the card has to communicate rather than on which
library is more popular. Worth carrying: the allocation rule was frequency, and the one
place frequency was the wrong rule was the card we show first.

**The reason any of this matters:** a symbol is baked into every cached PNG containing it.
Changing one after launch means a `RENDER_VERSION` bump and every card carrying it
re-rendered. Getting the allocation right before the renderer exists is the cheap moment,
and it is the only one.

---

*New entries go above this line as they happen.*
