# Stackshot

Paste a GitHub repo URL, get a designed card showing what that project is actually built
with — layered frontend over backend over infrastructure — as a PNG you can embed in a
README on both GitHub themes.

**Live:** https://stackshot.\<your-domain\>
**Example:** paste `vercel/next.js`

<!-- Replace with the real embed once Milestone 2 ships -->
<!--
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://stackshot.<your-domain>/vercel/next.js/card-dark.png">
  <img src="https://stackshot.<your-domain>/vercel/next.js/card-light.png" alt="Stack: Next.js 15, React 19, Tailwind 4, Node 22, PostgreSQL 16">
</picture>
-->

---

## Why it isn't just reading package.json

That was the naive version, and it produces embarrassing output on real repositories. The
interesting work is in four places.

**1. GitHub never fetches your image.**
Every README image is proxied through Camo, which fetches once, sanitizes, caches, and
serves from its own infrastructure. That single constraint decides almost everything:
SVG is out (Camo strips `@font-face`, so custom type never loads), theme-responsive images
are out (media queries inside a proxied image don't evaluate against the reader), and
per-view analytics are out. The supported path is an HTML `<picture>` element with two
separate PNGs — so every stack renders twice, and the cache has to be good.

**2. The card has to survive being 600 pixels wide.**
And ~390 pixels wide on GitHub mobile, on two themes, with no interactivity and no
fallback. The design is built from that constraint backwards: layers are separated by
**rule weight rather than colour** (borrowed from the FDA nutrition panel), technology
names are set in type rather than logos, and per-technology descriptions were cut from the
card entirely because they turn to grey mush at display size.

**3. Detection is a union over a file tree, not a manifest read.**
One recursive Trees API call returns every path in the repo. From that we select up to six
manifests by priority — root `package.json`, then `go.mod` / `pyproject.toml` /
`Cargo.toml` / `Gemfile` / `composer.json`, then `Dockerfile`, then the first CI workflow,
then remaining `package.json` files shallowest-first — and union them. Monorepos work
without any workspace-glob resolution, because the tree already says where the manifests
are.

Lockfiles are never parsed. A dependency that appears only in a lockfile is transitive, and
transitive dependencies are noise.

**4. The cache is keyed on content, not commits.**
Rendering is a pure function of `(StackDoc, theme)` — same input, byte-identical output,
enforced by a test. That purity means renders can be keyed on a hash of the extracted
stack rather than the commit SHA, so a README typo costs two API calls and zero renders.
Major-version-only display (`Next.js 15`, not `Next.js ^15.1.0`) means patch bumps don't
invalidate anything either.

The reason the whole thing needs only **two authenticated API calls per cold resolve** is a
smaller trick: manifest contents come from `raw.githubusercontent.com` pinned to the
resolved SHA, which doesn't consume the REST rate limit.

---

## Architecture in one diagram

```
  url ─▶ resolve ─▶ StackDoc ─▶ sha256 ─▶ render ─▶ PNG ─▶ CDN ─▶ Camo ─▶ reader
         (network)  (data)      (key)     (pure)          (cached) (opaque)
```

Only route handlers know a network exists. Everything below them is pure functions over
committed fixtures, which is why the test suite makes no network calls.

Full version, with invariants, in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Hard parts

| Problem | Approach |
|---|---|
| Theme-responsive image behind a caching proxy | Two PNGs, `<picture>` element ([ADR-0003](./DECISIONS/0003-two-pngs-picture-element.md)) |
| Legibility at 390px | Rule-weight hierarchy, 2× rasterization, descriptions moved off the card |
| Logos: licensing, aspect ratios, missing assets | Don't use logos. Type treatment instead ([ADR-0002](./DECISIONS/0002-type-not-logos.md)) |
| Monorepos without a workspace resolver | Union every `package.json` in the tree ([ADR-0001](./DECISIONS/0001-detection-scope.md)) |
| `Next.js` implies `React` — listing both is noise | A `suppresses` field on each map entry ([ADR-0006](./DECISIONS/0006-stack-map-as-typed-module.md)) |
| Rate limits on a public, uncontrolled endpoint | Content-hash cache, negative cache, raw fetches, global budget guard |
| A broken image in a stranger's README | Failures render an error card at HTTP 200 ([ADR-0007](./DECISIONS/0007-errors-render-a-card.md)) |

---

## Limitations, honestly

- **Public repos only.** Private repos would require a GitHub App and an install flow.
- **Versions are declared floors, not installed versions.** `^15.1.0` renders as `15`.
  Resolving the real installed version means parsing a lockfile, which this deliberately
  doesn't do.
- **`<picture>` follows your OS colour preference, not your GitHub theme setting.** If
  those disagree, you'll see the card that matches your OS. There is no fix for this.
- **Curated map, not exhaustive.** Roughly 120 technologies. Anything unrecognized is
  dropped rather than guessed at. Unmapped names are logged and become the backlog.
- **Embedded cards update slowly.** Camo's cache TTL is not ours to control.
  [Measured value in GOTCHAS.md](./GOTCHAS.md).
- **Large repos may be sampled.** The Trees API truncates; we fall back to a root listing
  and mark the result partial.
- **Docker and CI signals are regex-matched, not parsed.** They rank below declared
  dependencies and are the first thing cut when a layer is full.

---

## Scope

**In:** paste a URL, generate the card, download the PNG, copy the embed snippet.
**Out:** accounts, saved cards, custom themes, private repos, comparison mode, an iframe
embed, a public API.

This is a small tool built deliberately small. The reasoning is all committed — see
[`DECISIONS/`](./DECISIONS) for why each choice was made and what would change it, and
[`GOTCHAS.md`](./GOTCHAS.md) for what went wrong along the way.

---

## Running locally

```bash
pnpm install
cp .env.example .env.local   # GITHUB_TOKEN, UPSTASH_REDIS_*
pnpm dev
```

```bash
pnpm test                          # no network; fixtures only
pnpm tsx scripts/resolve.ts vercel/next.js   # print a StackDoc
```

---

## Adding a technology

One entry in `lib/stack-map/entries/`:

```ts
{
  id: "drizzle",
  display: "Drizzle",
  category: "backend",
  weight: 70,
  description: "Type-safe SQL query builder and schema toolkit.",
  suppresses: ["drizzle-kit"],
}
```

The integrity test checks that ids are unique, that every `suppresses` target exists, and
that nothing is both mapped and denied. PRs welcome.
