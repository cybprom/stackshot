# WRITEUP-OUTLINE.md

**Working title:** Designing an image that survives GitHub's image proxy

**Length:** 1,500–2,000 words. This is a small project; a long post would oversell it.

**Angle:** Not "I built a stack card generator". That post is boring and there are three
of them. The post is about a constraint almost nobody knows exists — GitHub's Camo proxy —
and the chain of design and architecture decisions that fall out of it. The product is the
excuse; the constraint is the subject.

**Original brief said:** "generating images at the edge with Satori". That angle died with
[ADR-0004](./DECISIONS/0004-satori-resvg-on-node.md) — this doesn't run at the edge, and
the reason why is more interesting than the edge would have been.

**Audience:** developers who have embedded a badge in a README and never thought about
what happens on the other side of that URL.

---

## Structure

### 1. Open with the failure, not the product · ~150 words

Lead with the SVG that worked perfectly locally and rendered as a fontless mess on GitHub.
Show both. The reader who has ever built a badge feels this immediately.

Do not open with "I built Stackshot". Nobody cares yet.

### 2. What Camo actually does · ~250 words

The mechanic: GitHub rewrites every image URL to `camo.githubusercontent.com`, fetches
once, sanitizes, caches, serves from its own infrastructure.

Four consequences, stated plainly:
- your server is never hit by a reader
- no per-view telemetry, at all
- SVG is sanitized and `@font-face` is stripped
- failures get cached along with successes

This section is the reason the post exists. Take the time to make it clear.

### 3. So how does a proxied image know about dark mode? · ~250 words

It doesn't. Walk the dead ends: media queries inside an SVG, the `#gh-dark-mode-only`
fragment (removed, and still all over stale blog posts), a single theme-agnostic card.

Land on `<picture>` with two URLs. Note the residual mismatch: it follows the OS colour
preference, not the GitHub theme setting, so some readers will always see the wrong card.

### 4. Two images means the cache has to be good · ~300 words

The pivot from design to architecture.

Purity first: the renderer is a pure function of `(StackDoc, theme)`, enforced by a test
that renders twice and compares bytes. Then the payoff: because it's pure, the cache can be
keyed on a hash of the extracted stack rather than the commit SHA, so most pushes cost
zero renders.

The `asOf` detail belongs here — a generation timestamp would have broken determinism, so
the date on the card means "when this stack last changed" instead. A constraint producing
a better feature than the thing it blocked. Good beat, don't overplay it.

### 5. Designing for 390 pixels · ~350 words

The hardest section to write well and the most valuable. Show, don't describe.

- Hierarchy from rule weight instead of colour, and where that came from (a nutrition
  label).
- Type instead of logos, and the four separate reasons: licensing forbids recolouring,
  Satori needs data URIs, aspect ratios don't normalize, half of them don't exist.
- Descriptions cut from the card because they become texture at display size.
- Rendering at 2× so small type survives downscaling.

Screenshots at each width. This section is carried by images, not prose.

### 6. The part that isn't code · ~250 words

The curated map: ~120 entries, a `suppresses` field, and why the difference between a good
card and a bad one is entirely data.

Before/after for one repo: the raw dependency dump versus the card. This is the most
shareable image in the post.

Then the honest bit — unmapped-package logs are the only usage metric that exists, because
of section 2. The constraint closes the loop.

### 7. What I'd do differently · ~150 words

Real ones, drawn from `GOTCHAS.md`, not performed humility. Likely candidates: the root
`/{owner}` route decision, whatever Milestone 0 disproved, and whichever anticipated gotcha
turned out to be wrong.

### 8. Close · ~100 words

Link the tool. One line inviting map contributions. No call to action beyond that.

---

## Claims that need evidence

Nothing in the list below ships in the post without a number or a screenshot behind it.
Collect these **during the build**, not afterwards — several are unrecoverable once the
work is done.

| # | Claim | Evidence needed | Collect at |
|---|---|---|---|
| 1 | Camo strips `@font-face` from SVG | Side-by-side screenshot: local SVG vs the same SVG through Camo | M0 |
| 2 | `<picture>` is the only working theme mechanism | Screenshots on all 5 surfaces: desktop light, desktop dark, mobile web, iOS app, Android app | M0 |
| 3 | `#gh-dark-mode-only` no longer works | A test repo demonstrating it, plus the GitHub changelog entry | M0 |
| 4 | Embedded cards update in roughly N hours | **Measured** Camo TTL: change bytes, redeploy, poll, record. Also record whether `PURGE` works | M0 |
| 5 | Rendering at 2× materially improves small-type legibility | 1× vs 2× crop at 600px display width, same card | M0 |
| 6 | The rotated gutter renders correctly in Satori | The card itself, or the fallback and why | M0 |
| 7 | Cold render takes N ms; PNG is N KB | p50 and p95 over 20 cold renders; byte size both themes | M0, re-measure M4 |
| 8 | Content-hash keying avoids most re-renders | Cache hit rate over the first two weeks, and the count of pushes that changed SHA but not `stackHash` | M4 + 2 weeks |
| 9 | Only 2 API calls per cold resolve | The budget counter's assertion, plus the test | M1 |
| 10 | `suppresses` is what separates a card from a dependency dump | Before/after render for one real repo, same data, suppression off vs on | M1 |
| 11 | Detection works across ecosystems | The 8 fixture cards, shown as a grid | M1 |
| 12 | Unmapped packages are a real long tail | Count of distinct unmapped ids and their frequency distribution | M4 + 2 weeks |
| 13 | Camo gives no usable telemetry | Server logs showing reader requests never arrive | M4 + 2 weeks |
| 14 | Trees API truncation is not a rare edge case | Which of the tried repos truncated | M1 |

**Claims to avoid making**, because they can't be supported and inviting scrutiny on them
would undercut the rest: adoption numbers (unmeasurable, see #13), "the first tool to do
X", any performance claim about Satori versus alternatives that wasn't benchmarked, and any
suggestion that this was technically difficult. It wasn't. The post is interesting because
the constraint is interesting, and saying so plainly is stronger than inflating it.

---

## Assets to prepare

- The opening failure screenshot pair (section 1)
- Five-surface theme screenshot grid (section 3)
- Width comparison: 1200 / 600 / 390 (section 5)
- 1× vs 2× crop (section 5)
- Suppression before/after (section 6)
- Eight-fixture card grid (section 6)

Commit all of these to `docs/writeup/` as they are produced. Recreating a Milestone 0
screenshot in Milestone 4 is either impossible or a lie.
