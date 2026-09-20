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

---

*New entries go above this line as they happen.*
