# DESIGN.md

The generated card is the product. The site is a delivery mechanism. Where the two compete
for attention or effort, the card wins.

---

## GENRE

A component datasheet for a codebase — the density and authority of a reference document,
designed to be read at thumbnail size inside someone else's README by a developer who is
scrolling, not studying.

---

## REFERENCES

Eight, all real, all specific about what to take.

1. **Teenage Engineering product panels** (OP-1, TX-6) — every zone is labelled like a
   control surface, and the micro-type becomes a texture rather than a caption. Take: the
   confidence to label structure explicitly instead of hiding it.
2. **Texas Instruments / Analog Devices datasheet pin-out pages** — take the tolerance for
   density and, critically, the idea that *vertical position carries meaning*. Nothing on
   those pages is where it is by accident.
3. **FDA nutrition facts panel** — hierarchy produced entirely by **rule weight**, with no
   color at all. This is the single most important reference in the list and the direct
   source of our layer-separation system.
4. **Architectural drawing title blocks** — the small metadata block in the corner
   (revision, date, scale) as an authority signal. Take: the footer treatment.
5. **Panic** (Playdate packaging, Nova release notes) — flat confident color and precision
   without stiffness. Take: proof that technical can be warm.
6. **Shields.io badges** — study why a 20px-tall image became universal, and study the
   failure mode: fifteen of them stacked reads as noise. Take: the reason we are one card
   and not a row of chips.
7. **Klim Type Foundry specimen pages** — presenting a name plus its metadata across
   wildly different sizes. Take: the repo-name treatment.
8. **Fly.io and Railway docs diagrams** — layered infrastructure drawings where the y-axis
   is semantic. Take: confirmation that layer-as-vertical-position reads correctly to
   developers without a legend.

If you want to build the board yourself, the places to look are Mobbin, Godly, Land-book,
SaaS Interface, Typewolf and Fonts In Use.

---

## TYPE

Two faces. Both open-licensed, both available as TTF/OTF — **Satori cannot load WOFF2**,
which rules out a large share of modern webfont distributions.

### Primary — Commit Mono

Everything structural: layer labels, package names, versions, metadata block, and all data
on the site.

- Designer: Eigil Nikolajsen. Distributed at commitmono.com and on GitHub.
- Licence: SIL Open Font License 1.1. **Verify the `LICENSE` file in the downloaded
  release before shipping and commit a copy to `public/fonts/`.** Do not rely on this doc.
- **Ships 400 and 700 only, and the scale is built on that.** The release carries no 500 or
  600; those weights exist only as source files in the upstream repo. An earlier draft of
  the table asked for 400/500/600 and that was wrong for a second reason anyway — adjacent
  mono weights are invisible at the display ratio, the same failure as the rule ladder.
  Do not "restore" them. See GOTCHAS 014.
- **Take the TTFs, not the OTFs.** The release OTFs carry an `ltag` table that Satori
  cannot parse. See GOTCHAS 015.
- Why: a monospace at small sizes reads as *machine-generated on purpose*, which is the
  genre. It also solves a real problem — version strings and package names align into
  columns for free, which is what makes the card scannable at 600px.
- Fallback stack (site only): `"Commit Mono", ui-monospace, "SF Mono", "Cascadia Mono",
  Menlo, monospace`.

### Secondary — Archivo

The repo name, and nothing else. One use, at one size.

- Designer: Omnibus-Type. Licence: SIL Open Font License 1.1.
- Why: an industrial grotesque with genuinely tight default proportions, so it holds
  negative tracking at display size without collapsing. It is not Inter, not Geist, not
  Helvetica, and not a trend marker.
- Fallback stack (site only): `Archivo, "Helvetica Neue", Arial, sans-serif`.
- Ship only the static weights used (400, 600). Do not ship the variable file — it bloats
  the bundle and Satori handles static faces more predictably.

**Alternate primary** if Archivo reads too neutral once you see it rendered: Instrument
Sans (OFL). **Explicitly rejected:** Inter (banned by brief), Space Grotesk and Bricolage
Grotesque (both are 2023-trend markers and now read as dated rather than distinctive),
JetBrains Mono (the default developer-tool mono; picking it would be a reflex).

No third face. A mono is already present, so the data case is covered.

### Card scale

All sizes are in the card's 1200-unit coordinate space. The card renders at 2×. **Measured
display ratios, not estimated** — an earlier mnemonic here ("roughly one quarter of the
number") was wrong by 2× and this project has been bitten by display-ratio arithmetic three
times:

| Surface | Card width | px per unit |
|---|---|---|
| Desktop README | ~1100px | 0.92 |
| GitHub mobile web | ~380px | 0.32 |
| GitHub iOS / Android app | ~350px | 0.29 |

So a 30-unit item name is 27.5px on desktop and 8.75px in the apps. **The app column is the
one that governs** — anything that must be read has to survive 0.29. See GOTCHAS 022.

| Step | Use | Size | Weight | Line height | Tracking |
|---|---|---|---|---|---|
| `card/display` | Repo name | 64 | Archivo 600 | 1.00 | -0.02em |
| `card/owner` | Owner, above repo name | 24 | Mono 400 | 1.20 | 0.00em |
| `card/item` | Package name | 30 | Mono 400 | 1.10 | -0.01em |
| `card/version` | Version, after name | 22 | Mono 400 | 1.10 | 0.00em |
| `card/overflow` | "+7 more" | 22 | Mono 400 | 1.10 | 0.02em |
| `card/gutter` | Rotated layer label | 18 | Mono 700 | 1.00 | 0.18em |
| `card/meta` | Footer | 16 | Mono 400 | 1.20 | 0.04em |

Tracking tightens monotonically as size increases: 0.18 → 0.04 → 0.02 → 0.00 → -0.01 →
-0.02. That relationship is the rule; individual values are negotiable, the relationship
is not.

**Long repo names step down, then wrap.** `card/display` is 64 up to ~22 characters, **48
past ~22**, **40 past ~30**, **36 past ~48**. The boundaries are character counts against a
proportional face, so check them against rendered width rather than the number.

The step alone is not the rule, because GitHub allows 100 characters and no legible size
fits 100 of them on one line. Three further constraints, all of them load-bearing:

- **The name wraps, and the header has to let it.** Repo names contain no spaces, so a
  name with no hyphens or dots has no break opportunity at all: without `wordBreak`, it
  leaves the canvas entirely rather than wrapping. This is not a rare shape.
- **Two lines is the limit, and it is a measure, not a count.** The 140-unit header band
  holds the owner line plus two name lines at every step (28.8 + 72 = 100.8 at 36). A
  third line overruns the 8-unit rule below it and paints into the first layer band, which
  looks like a rendering bug rather than a long name.
- **Past two lines the name truncates with an ellipsis.** This is a real exception to the
  rule that held here before — "never truncate, a clipped name is worse than a small one"
  — and the argument for the exception is that at ~100 characters the name is not legible
  at thumbnail size at any size that fits, so the thing the old rule protected is already
  gone. Truncation is unreachable for an ordinary lowercase-and-hyphen name of 100
  characters; what reaches it is a name crafted to be wide. The site shows the full name
  in HTML beside the card, so nothing is lost that a reader can act on.

All four surfaces still apply: 36 units is 10.4px in the GitHub apps, above `card/item`'s
8.75px, so the name never becomes the least legible thing on the card. See GOTCHAS 039.

**`card/item` and `card/version` are the same weight**, so name-versus-version rests
entirely on `ink` against `ink-muted`. That is contrast rather than stroke, and contrast is
what survives downscaling. **Verified at step 7 on all five surfaces** — versions read as
subordinate at 6.4px without reading as damaged. The `card/item` → 700 fallback is not
needed and should not be reached for casually.

### Site scale

| Step | Use | Size | Weight | Line height | Tracking |
|---|---|---|---|---|---|
| `site/display` | The one headline | 56 | Archivo 600 | 1.00 | -0.03em |
| `site/title` | Section title | 28 | Archivo 600 | 1.15 | -0.02em |
| `site/body` | Prose | 17 | Archivo 400 | 1.55 | -0.005em |
| `site/data` | Package rows, versions | 15 | Mono 400 | 1.45 | 0.00em |
| `site/code` | Markdown snippet | 14 | Mono 400 | 1.50 | 0.00em |
| `site/label` | Form label | 14 | Mono 500 | 1.20 | 0.02em |

Body line length capped at 68 characters.

---

## COLOR

Five named tokens per theme. Neutrals carry a cool green-blue cast throughout — none of
these are Tailwind's gray, slate, or zinc, and none are a pure desaturated neutral.

| Token | Light | Dark | Role |
|---|---|---|---|
| `surface` | `#EDEEEA` | `#0E1113` | Card and page background |
| `ink` | `#101615` | `#DDE2DD` | All primary text, all meaningful rules |
| `ink-muted` | `#5A625E` | `#8B9490` | Versions, owner, footer metadata |
| `rule` | `#C8CCC4` | `#242A2B` | Decorative hairlines only — see the warning below |
| `accent` | `#C8461E` | `#FF6B3D` | One 4-unit bar at the card's top edge. Nothing else. |

**The accent is a single hue expressed twice.** One hex cannot clear AA on both
backgrounds, so light and dark carry different values of the same colour. This is a
deliberate exception to "one accent", not two accents.

**Warning that must survive into code:** `rule` does not meet 3:1 against `surface`. It is
therefore **decorative only** — item separators within a layer band. Every line that
*encodes information* (layer separators, the card border, the gutter divider) uses `ink`,
at varying weight and **never below 3 units**. Below 3 the line is subpixel at display size
and the weight distinction it exists to carry disappears. If you find yourself using `rule`
to separate two layers, you have broken the accessibility floor.

### Semantic colors

Listed separately because they are not part of the palette and appear only on the site.

| Token | Light | Dark | Use |
|---|---|---|---|
| `error` | `#9B2C10` | `#F08055` | Failed resolve message |
| `success` | `#2F5E3F` | `#79B18D` | "Copied" confirmation |

The generated card has **no semantic colors at all**. The error card is rendered in the
normal palette with different content. A red error card in a README would be alarming and
wrong.

---

## SPACING

One scale, 4-unit base:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`

Nothing off-scale ships. This includes inline styles inside the Satori element tree, where
it is tempting to nudge a value by 3 units to fix an optical problem. If a step is wrong,
change the step, don't add a new one. The single exception is the accent bar's 4-unit
height, which is on-scale anyway.

Card outer padding: 32. Gutter width: 72 (off-scale by necessity — it is derived from the
rotated label's cap height, and it is the only exception; document it in code with a
one-line comment).

---

## SURFACE

- **Radius: 2.** One value, everywhere, card and site. A datasheet does not have rounded
  corners. `rounded-xl` is banned by name.
- **Border: 3 units, `ink`.** The card has exactly one border, at its outer edge. Internal
  structure is rules, not boxes. There are no nested cards, no panels, no containers.
- **Shadows: none.** Two reasons, both sufficient. A card embedded in a README should sit
  flat in the page rather than float above it, and Satori's shadow support is partial
  enough that any two-layer set would render inconsistently. The site has no shadows
  either — depth on the site would contradict the card.

---

## MOTION

Motion applies to the site only. The product is a static image; it does not animate.

**Durations**
- `motion/state` — 120ms. Button and input state changes.
- `motion/arrival` — 200ms. The card appearing after a resolve.

**Easings**
- `ease/standard` — `cubic-bezier(0.2, 0, 0, 1)`. Everything uses this.

**What animates** — a short, closed list:
1. The card's arrival after a successful resolve: opacity 0→1 plus a 2-unit rise.
2. The copy button's confirmation state.
3. Focus ring appearance.

**What must not animate** — enforce this in review:
- Anything on initial page load. The page arrives complete.
- Any hover state on the card or its contents.
- Layout, height, or position of anything other than item 1 above.
- The headline, ever.
- Scroll-triggered anything. There is no scroll-triggered anything.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, item 1 becomes opacity-only
with no rise, and items 2 and 3 become instant. This is a real branch in the CSS, not a
global `animation: none` sledgehammer.

---

## SIGNATURE

**A left gutter running the full height of the card, carrying the layer names rotated 90°,
reading bottom-to-top, in tracked-out mono: FRONTEND / BACKEND / INFRA / TOOLING.**

It is the one element that makes a Stackshot card identifiable at 300px when not a single
package name is legible. It reads as a section drawing rather than a dashboard, it costs
72 units of horizontal space and nothing else, and it is structurally honest — the label
is physically beside the thing it labels.

Everything else stays quiet: no icons, no logos, no decorative marks, no background
texture, no second color.

**Verified at Milestone 0 step 3: the rotated labels render correctly.** The signature
stands as designed and the stacked-letter fallback is not needed. Evidence:
`docs/spike/gutter-comparison.png`, both variants side by side.

The implementation is not obvious and the shape matters, so it is pinned here: an
absolutely positioned wrapper fills the band and centres its child; the label rotates about
its **own centre**, which is what keeps the band height out of the problem. The label needs
`whiteSpace: nowrap` and `flexShrink: 0` or it wraps inside the 72-unit gutter before it is
ever rotated. See GOTCHAS 004.

**Band height is constrained by the longest label, not only by content.** FRONTEND is 110.0
units rotated — measured from satori's layout pass, correcting an earlier 102.4 — against a
band floor of 120, so it clears by 10. Any redesign that shrinks bands below ~110 —
including this doc's own "3 layers × 4 items" fallback — breaks the gutter, and it will
look like a rotation bug rather than a spacing one.

---

## CARD ANATOMY

1200 × 800 units. **Not 1200 × 630** — see the self-critique below.

```
┌════════════════════════════════════════════════════════════════┐  4u accent bar
│                                                                │
│  ┌──────┬──────────────────────────────────────────────────┐   │
│  │      │  vercel/                              TypeScript │   │  header band
│  │      │  next.js                             128k stars  │   │  140u
│  │      ├══════════════════════════════════════════════════┤   │  8u ink rule
│  │ F    │                                                  │   │
│  │ R  ↑ │  Next.js 15    React 19    Tailwind 4            │   │  layer band
│  │ O    │  TanStack Query 5    Zod 3                       │   │  flex, min 120u
│  │ N    │                                                  │   │
│  │ T    ├──────────────────────────────────────────────────┤   │  5u ink rule
│  │      │                                                  │   │
│  │ B  ↑ │  Node 22    PostgreSQL 16    Prisma 6            │   │
│  │ A    │                                                  │   │
│  │ C    ├──────────────────────────────────────────────────┤   │  3u ink rule
│  │ K    │                                                  │   │
│  │      │  Docker    GitHub Actions    Vercel              │   │
│  │ I  ↑ │                                                  │   │
│  │ N    ├──────────────────────────────────────────────────┤   │  3u ink rule
│  │ F    │                                                  │   │
│  │ R  ↑ │  pnpm    Vitest    ESLint    +4 more             │   │
│  │      │                                                  │   │
│  └──────┴──────────────────────────────────────────────────┘   │
│  stackshot.ilerioluwa.com                                      │  footer 56u
└────────────────────────────────────────────────────────────────┘  3u ink border, r2
```

Rules:
- **Layer separator weight decreases downward: 8 · 5 · 3 · 3.** This is the nutrition-panel
  borrowing. Hierarchy comes from line weight, not color. 3 is the floor for any line that
  carries meaning — see COLOR.
- **Empty layers are omitted entirely**, and the remaining bands expand to fill. A frontend
  library with no backend shows two bands, not two bands and two blanks.
- **Band `minHeight` is 120, and it is load-bearing for two independent reasons.** It holds
  two wrapped lines of `card/item` plus 24/24 padding (114, rounded up), *and* it clears the
  longest rotated gutter label — FRONTEND needs 110 units, measured, leaving 10 to spare.
  Shrinking bands below ~110 breaks the gutter, and the failure presents as a rotation bug
  rather than a spacing one. Anything that reduces this number has to satisfy both
  constraints, not the one that prompted the change. See GOTCHAS 004.
- **Maximum 4 layers, maximum 6 items per layer.** Overflow renders as `+N more` in
  `ink-muted`. There is no scroll, no second page, no shrink-to-fit.
- **Items are name plus version inline**, version in `ink-muted`. Major version only:
  `Next.js 15`, never `Next.js ^15.1.0`. See ADR-0008.
- **No descriptions on the card.** They live on the site beneath the preview. See ADR-0009.
- **The footer carries the domain and nothing else.** It used to carry `stack as of
  <date>`; that date said when Stackshot first saw the stack rather than when the repo
  changed it, so it was wrong on the day a card was generated. Removed in ADR-0025. The
  right side of the footer is empty on both cards.

### The error card is 1200 × 518

Same width, same chrome, same palette, one band instead of four. **Width is held at 1200 so
every type size keeps the display ratios measured above**; only the height changes.

```
┌════════════════════════════════════════════════════════════════┐  4u accent bar
│  ┌──────┬──────────────────────────────────────────────────┐   │
│  │      │  octocat/                                        │   │  header band
│  │      │  hello-world                                     │   │  140u
│  │ N    ├══════════════════════════════════════════════════┤   │  8u ink rule
│  │ O    │                                                  │   │
│  │   ↑  │  Stackshot found no manifest files here.         │   │  message band
│  │ M    │  It reads package.json, pyproject.toml, …        │   │  240u
│  │ A    │                                                  │   │
│  └──────┴──────────────────────────────────────────────────┘   │
│  stackshot.ilerioluwa.com                                      │  footer 56u
└────────────────────────────────────────────────────────────────┘  3u ink border, r2
```

- **518 is derived, never chosen**: `2×3 border + 4 accent + 2×32 padding + 140 header +
  8 rule + 240 band + 56 footer`. `ERROR_CARD_HEIGHT` computes it from those tokens, so a
  change to any of them moves the height rather than leaving a gap.
- **The 240-unit band is sized by the gutter label, not by the text.** `NOTHING MAPPED`
  is 191 units rotated, well past the 120-unit band floor a layer band uses. The message
  itself needs less. This is the same constraint as the layer bands and it fails the same
  silent way, so the fit assertion covers it.
- **The message is top-aligned in its band**, so the space below reads as a document's
  margin rather than as a notice centred in a void.
- **The footer matches a real card's**: the domain, nothing on the right.
- **Consequence for the embed:** one URL now serves two aspect ratios, 1200×800 and
  1200×518, depending on whether the repo resolves. The `<picture>` snippet the site
  hands out must not pin `width` or `height` on the `img`, or a failing repo's card
  renders distorted in a README that was copied while the repo still worked.

---

## QUALITY FLOOR

Build to this without announcing it.

- **Responsive to mobile.** The site works at 360px. The card's real test is GitHub's
  mobile web view at ~390px and the GitHub iOS/Android apps — all four surfaces are part
  of Milestone 0's acceptance, not an afterthought.
- **Visible keyboard focus.** A 2-unit `accent` outline with a 2-unit offset on every
  interactive element. Never `outline: none` without a replacement in the same rule.
- **WCAG AA.** All text pairs above meet 4.5:1; verify with a checker rather than trusting
  this table. `rule` is excluded because it carries no information (see COLOR).
- **Empty state.** The page before a URL is entered shows a real Stackshot card for a
  well-known repo, captioned. It demonstrates the product instead of describing it.
- **Error states.** Three distinct ones, each naming the repo and the reason: repo not
  found, no recognizable manifests, GitHub rate limit reached. Never a generic failure.
- **The error card.** Rendered in the full palette, stating the repo and the reason, so a
  README that embeds a broken repo shows an explanation rather than a broken-image icon.
- **Loading.** A resolve takes seconds, not milliseconds. The button enters a labelled
  pending state; the page does not show a skeleton of a card it cannot predict.

---

## UI COPY RULES

- **Active voice.** "Stackshot couldn't read this repo", not "This repo could not be read".
- **Sentence case everywhere on the site.** Headings, buttons, labels, errors. The card's
  gutter labels are the only all-caps in the project, and they are structural signage, not
  headings.
- **Buttons are named for what happens.** "Generate card", "Download PNG", "Copy markdown".
  Never "Submit", "Go", "Click here", or a bare arrow.
- **The same verb runs through a whole flow.** The button says "Copy markdown", the
  confirmation says "Markdown copied". If one changes, both change.
- **Errors say what broke and how to fix it.** "Couldn't read `octocat/hello` — no manifest
  files found on the default branch. Stackshot reads package.json, go.mod, pyproject.toml,
  Cargo.toml, Gemfile and composer.json." Never "Something went wrong."
- **Errors do not apologize** and do not use exclamation marks.
- **Empty states invite an action**, they don't describe emptiness.
- **No filler.** No "simply", "just", "powerful", "seamless", "beautiful". No em-dash
  asides in interface copy.
- **No trailing arrows on links or buttons.** No middle-dot-joined metadata strings.
- **The word "stack" means the detected technologies.** It never means anything else.

---

## SELF-CRITIQUE

For each decision: would I have produced this for a completely different brief? Where the
answer was yes, it was a default and has been changed. Five revisions.

**1. Canvas was 1200 × 630. Changed to 1200 × 750, then to 1200 × 800.**
1.91:1 is the OpenGraph ratio, which is what every image-generation tool reaches for. It
is correct for a link preview and has nothing to do with a four-band layered diagram. 630
units forced the bands to 110 each, which broke at mobile width. The new ratio is derived
from the content.

750 then failed the same way for a different reason. Raising every information-bearing line
to the 3-unit floor added 12 units of overhead to a budget with under 5 to spare, leaving
four bands at 115 against a 120 floor. Same derivation, more overhead above the bands:
630 → 750 → **800**, which gives 511 across four bands and about 8 units of headroom.
See GOTCHAS 012.

**2. Layers were color-coded, one hue each. Changed to rule-weight encoding.**
Four colors for four categories is what every diagram tool does, and it would have
silently broken the one-accent rule while adding zero information that vertical position
wasn't already carrying. Rule weight is quieter, denser, and traceable to a specific
reference (the nutrition panel) rather than to habit.

**3. Radius was 8. Changed to 2.**
Pure reflex. `rounded-lg` is the value I would have produced for any brief in any year.
A specimen card has corners.

**4. Typography was going to include a third face for the repo name. Cut to two.**
The impulse was "display needs its own voice", which is a generic instinct rather than a
response to this brief. The card has one large text element; a face bought for one string
is not a system, it is decoration.

**5. The site was going to open with the input field centered in a viewport-height hero.
Changed to a centered column whose contents align to the card's left edge, with a real
example card above the fold.**
Centered-input-in-a-void is the default for every paste-a-URL tool, and leading with a real
generated card makes the page argue for itself in the first second. That is the honest
hierarchy: the card matters, the input doesn't.

To be precise, because "left-aligned" is easy to misread as a whole-page mandate: **the
column is centered in the viewport at roughly the card's natural width (~1100px). Inside
it, everything is left-aligned to the card's left edge.** The page does not hug the
viewport edge.

**The card's left edge is the page's alignment spine.** Headline, input, snippet block,
description list and footer all start there; nothing on the page begins anywhere else. On a
sparse page that single shared edge is what stops the content reading as scattered — it
does the compositional work a full grid would do on a denser page. Centering individual
elements within the column is the thing being ruled out, not centering the column.

### Two knowingly-retained defaults, and the argument for keeping them

Design guidance I hold generally treats **all-caps labels** and **a monospace face for
small data labels** as tells of generated work. Both are present here, deliberately.

- The gutter labels are all-caps because they are *signage on a technical drawing*, not
  eyebrow labels above headings. The distinguishing test: an eyebrow label sits above
  content and describes it redundantly; these sit beside content and are the only thing
  naming the axis. There is no headline for them to be an eyebrow to. **On the site, there
  are no all-caps labels at all** — that ban holds.
- Mono is the primary face rather than an accent for data, which inverts the usual tell.
  The generic version is a sans-serif design with mono sprinkled on the metrics. Here mono
  carries the whole card, and the sans appears once. The brief pins the genre to a spec
  sheet, and the brief wins over the general rule.

If Milestone 0's screenshots show the card reading as generic anyway, the escape hatch is
to set package names in Archivo and keep mono only for versions — try that before
abandoning the direction.

### One thing this design is still at risk of

The card is dense, and density fails in exactly one place: GitHub's mobile app. If the
rendered result at 390px is unreadable, the fix is structural (3 layers × 4 items, larger
nominal type), not cosmetic. That verdict belongs to Milestone 0, and the spike's
screenshots should be committed to the repo as evidence for the writeup.
