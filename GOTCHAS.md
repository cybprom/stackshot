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
real constraint is GOTCHAS 004's: the rotated FRONTEND label needs ~103 units of band
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

## 024 — Path order hands Next.js's `package.json` slots to `examples/`
**Date:** 2026-09-22 · **Cost:** ~0h, caught in plan review · **Status:** anticipated
**Writeup material:** yes — a one-line illustration of why "shallowest first" isn't a rule

"Remaining package.json files, shallowest first" with ties broken by path would pick, for
vercel/next.js, four demo apps from `examples/`, because `examples/` sorts before
`packages/` at the same depth. The card would show the stack of the examples, not of
Next.js. Fix: skip any path with a directory segment in a deny list (`examples`, `test`,
`fixtures`, `e2e`, `demo`, `templates`, `vendor`, …). There's a Next.js-shaped table case
in `tests/tree.test.ts`. `docs/` is deliberately still allowed. spyde's docs site is the
first test of whether that reads as noise.

**The fix is only half the problem: the tie-break is still wrong.** With `examples/` gone,
the four remaining slots go to the first four `packages/*` by path: `create-next-app`,
`eslint-config-next`, `eslint-plugin-next`, `font`… `packages/next` itself sorts late and
very likely gets no slot. The table case passes only because its input has four packages.
**Candidate fix, not applied:** among equal-depth candidates, prefer the larger blob `size`
from the tree entry, which we already have from call 2, before falling back to path. The
real package tends to have the largest manifest. Step 5 decides this with the real card:
vercel/next.js must be in its fixture set.

Small related surprise: in code-unit order `packages/next-swc/` sorts *before*
`packages/next/`, because `-` (0x2D) < `/` (0x2F). I got it wrong in the test expectation
first. The code sorts by code unit on purpose, since `localeCompare` would vary by host.

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

---

*New entries go above this line as they happen.*
