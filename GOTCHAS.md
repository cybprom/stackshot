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
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** yes

No `display: grid`. Partial flexbox. Limited shadow support. No `calc()`. Every element
effectively needs explicit flex behaviour.

The specific risk for this project is `transform: rotate()` on the gutter labels inside a
flex container — the signature element of the whole design. **Milestone 0 verifies this
first.** If it fails, the fallback is stacked single-letter labels.

## 005 — `@resvg/resvg-js` is a native binary, so no edge runtime
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** minor

The route must be `runtime = "nodejs"`. This also means verifying the correct native binary
resolves on Vercel's build, which is a deploy-time failure, not a local one. Check it in
Milestone 0.

## 006 — The recursive Trees API truncates on large repos
**Date:** planning · **Cost:** — · **Status:** anticipated
**Writeup material:** yes

`GET /git/trees/{sha}?recursive=1` returns `truncated: true` and an incomplete file list
for large repos. Our entire detection substrate is that one call.

Fallback: a root-level `/contents` listing, and mark the resulting doc as partial. This
will happen on exactly the kind of famous monorepo people will try first, so it is not a
rare edge case.

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

## 011 — The GitHub apps may not honour `<picture>`
**Date:** planning · **Cost:** — · **Status:** anticipated — **must be verified**
**Writeup material:** yes

Desktop GitHub supports `<picture>` with `prefers-color-scheme`. Whether the iOS and
Android apps render it, and whether they evaluate it against the OS preference or the
app's own theme setting, is unverified. This is a Milestone 0 acceptance item.

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


---

*New entries go above this line as they happen.*
