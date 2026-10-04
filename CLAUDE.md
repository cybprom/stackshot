# CLAUDE.md

Instructions for Claude Code working in this repository. Read this before touching anything.

---

## What this project is

Stackshot takes a GitHub repo URL and produces a designed PNG showing that project's tech
stack, arranged in meaningful layers. The PNG is embeddable in a README via a `<picture>`
element so it responds to GitHub's light and dark themes.

**The generated image is the product.** The website is a single page whose only job is to
accept a URL and hand back two things to copy. Time spent on the site beyond that is time
taken from the card.

Read `ARCHITECTURE.md` for the system and its invariants, `DESIGN.md` before writing any
UI or card code, and `DECISIONS/` for why things are the way they are.

---

## Stack

| Concern         | Choice                                | Notes                                                                                 |
| --------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| Framework       | Next.js App Router                    | Route handlers for the API. No pages router.                                          |
| Language        | TypeScript, `strict: true`            | No `any`. No `as` casts to escape a type error — fix the type.                        |
| Styling         | Tailwind v4                           | CSS-first config. Tokens from `DESIGN.md` only.                                       |
| Validation      | Zod                                   | Every external boundary: URL input, GitHub responses, KV reads.                       |
| Image render    | `satori` + `@resvg/resvg-js`          | Node runtime. Not `next/og`. See ADR-0004.                                            |
| Cache           | Upstash Redis                         | Plus CDN `s-maxage`.                                                                  |
| Host            | Vercel                                | Deployed at `stackshot.<your-domain>`.                                                |
| Tests           | Vitest                                | Fixture-driven. No network in tests.                                                  |
| Package manager | pnpm, via corepack                    | `packageManager` is pinned in `package.json`. Never run `npm` or `yarn` in this repo. |
| Analytics       | Redis counters + Vercel Web Analytics | Bounded — see ADR-0012.                                                               |

**pnpm caveat for this repo:** strict (non-hoisted) linking occasionally trips packages
that assume a flat `node_modules`. `@resvg/resvg-js` is a native binary and is the likely
candidate. If it fails to resolve, the escape hatch is `node-linker=hoisted` in `.npmrc` —
and it gets a `GOTCHAS.md` entry, because it is exactly the kind of thing worth recording.

The trigger to watch for is **"ships a non-JS asset"** — a `.node` binary, a `.wasm`,
anything Turbopack relocates when it bundles — not "native binary". That reframe also
catches `satori`, which is pure JS and still broke. See GOTCHAS 016.

Not used in this project, despite being in the author's usual toolkit: TanStack Query,
Zustand, Socket.IO, Framer Motion. There is no client state worth a store, no realtime,
and motion is limited enough for CSS transitions. Do not introduce them.

---

## Hard rules — never do these

1. **Never add a Claude co-author trail to a commit.** No `Co-Authored-By: Claude` trailer,
   no `Generated with Claude Code` line, no robot emoji, no tool attribution anywhere in a
   commit message, PR body, or changelog. Commit messages describe the change and nothing
   else.
2. **Never run `git push`** unless explicitly asked in that message. Committing locally is
   fine. Pushing is the author's decision.
3. **Never write long comments.** See the comment rules below — this is a standing quality
   bar, not a preference.
4. **Never let the card route return a non-200 for a rendering or resolution failure.**
   It returns an error card as image bytes. A broken-image icon in a stranger's README is
   the worst outcome this project has. (Invariant I5.)
5. **Never put a commit SHA in a badge URL.** Badges are branch-pinned and resolved
   server-side. (Invariant I1.)
6. **Never render a dependency that isn't in the curated map.** Unknown packages are
   dropped and logged. (Invariant I3.)
7. **Never parse a lockfile.** Transitive-only dependencies are noise by definition.
8. **Never fetch fonts at request time.** They are read from disk at module scope. (I7.)
9. **Never use a Tailwind default color, radius, or shadow.** If a value isn't in the
   token set, it doesn't ship.
10. **Never add a dependency without saying why in the same message.** This project has a
    small surface on purpose.

---

## Comments

Comment the non-obvious. Skip the obvious. Keep it short.

A comment explains **why**, or flags a constraint that isn't visible in the code. One or
two lines.

```ts
// Camo strips SVG @font-face, so PNG only.
const format = "png";
```

Not this:

```ts
/**
 * Determines the output format for the generated card image.
 *
 * We use PNG here because GitHub's Camo image proxy sanitizes SVG
 * content and removes @font-face declarations, which would mean our
 * custom typefaces fail to load...
 */
```

Specifically:

- Never restate the line below the comment.
- No comment banners or section dividers.
- A one-line JSDoc on an **exported** function is fine where it helps on hover. Never a
  multi-line block on an internal one.
- Long-form reasoning goes in `DECISIONS/` or `GOTCHAS.md`, never inline.
- No `// TODO` without a linked issue number or an entry in `ROADMAP.md`.

**Rule of thumb: if a function needs more than two lines of comment to be understood, the
function is wrong, not under-documented.** Fix the function.

Entries in `lib/stack-map/` are the place where explanatory notes are actively encouraged:
one line wherever a classification is contestable (e.g. why Prisma is `backend` and not
`tooling`).

---

## File layout

```
app/
  layout.tsx
  page.tsx                       one page, the whole site
  stack-form.tsx                 the page's only client island
  globals.css                    site tokens; the card's live in lib/tokens.ts
  api/resolve/route.ts           POST { url } -> StackDoc
  [owner]/[repo]/[file]/route.ts {style}-{theme}.png, plus legacy card-{theme}.png
lib/
  github/
    client.ts                    fetch wrapper, auth, budget counter, timeouts
    repo.ts                      GraphQL call 1: metadata, pinned commit, root entries
    tree.ts                      recursive tree -> manifest paths
    raw.ts                       raw.githubusercontent fetch at pinned sha, blob fallback
  detect/
    package-json.ts
    python.ts                    requirements.txt, pyproject.toml
    go.ts | rust.ts | ruby.ts | php.ts
    dockerfile.ts                Dockerfile and compose
    workflows.ts
    paths.ts                     root lockfiles and monorepo configs, by presence
    signal.ts | image-ref.ts     shared helpers, not detectors
    index.ts                     orchestrates -> RawSignal[]
  stack-map/
    entries/*.ts                 the curated data, split by category
    deny.ts                      known noise, namespaced globs, never logged
    index.ts                     assembled map + lookup (exact alias, then longest prefix)
    types.ts
  card-style.ts                  the style names, URL parsing; render-free, client-safe
  manifest-paths.ts              path filters shared by tree selection and detection
  site.ts                        SITE_ORIGIN, card URLs, the snippet, every site string
  normalize.ts                   RawSignal[] -> StackDoc
  version.ts                     version specs -> display version (ADR-0017, 0018)
  resolve.ts                     the full chain for one repo, client injected
  serve-card.ts                  cache + resolve + render for one request, client injected
  failure.ts                     ResolveError -> FailureReason + ERROR_COPY, card and site
  repo-ref.ts                    owner/repo name gate, ahead of any API call
  hash.ts                        stable stringify + sha256
  cache.ts                       Upstash wrapper, typed; no-op when unconfigured
  counters.ts                    failure-by-reason and the separate bug counter
  env.ts                         lazy reads, never throws — see scripts/check-env.ts
  render/
    card.tsx                     the Datasheet's Satori element tree
    tiles.tsx                    the Tiles tree: frame, grid, legend
    terminal.tsx                 the Terminal tree: frame, prompt, layer tree
    tiles-layout.ts              StackLayer[] -> 15 cells, 5 per row, 3 rows
    styles.ts                    CardStyle -> element tree + canvas height
    chrome.tsx                   every frame, plus header, domain and gutter label
    error-card.tsx               five reasons, one body, a frame per style (ADR-0033)
    fonts.ts                     read at module scope
    render.ts                    (StackDoc, theme) -> PNG bytes
  tokens.ts                      design tokens, single source
  result.ts                      Result<T, E>, types only
scripts/
  check-env.ts                   runs before `next build`; missing config fails the deploy
  record-github.ts               records GitHub responses into tests/fixtures/github/
  symbols.ts                     proposes the Tiles two-letter symbols; --write applies
  symbol-sheet.ts                every map entry as a tile, for reading them as a stranger
  render-cards.ts                every fixture card and error card to PNG, for looking at
  render-hashes.ts               regenerates tests/fixtures/render-hashes.json
  resolve.ts                     pnpm tsx scripts/resolve.ts owner/repo -> StackDoc JSON
tests/
  fixtures/                      recorded GitHub responses, committed
  helpers/fixture-fetch.ts       serves fixtures as fetch; unknown URLs fail
  *.test.ts
docs/
  spike/                         Milestone 0 output — screenshots, measurements
  writeup/                       post assets with no other home
DECISIONS/
```

`lib/render/` must not import from `lib/github/`. The renderer takes a `StackDoc` and
nothing else. If you find yourself needing a network call inside the renderer, the
boundary is wrong — stop and re-read `ARCHITECTURE.md`.

**`docs/spike/` and `docs/writeup/` never hold copies of each other.** Things live where
they were produced: spike output stays in `docs/spike/`, and the writeup references it
across directories. `docs/writeup/` holds only assets made for the post itself. Do not
tidy this up by copying a screenshot into the directory that seems to want it — two copies
drift, and at publishing time there is no way to tell which is current.

---

## Conventions

- Files: kebab-case. React components: PascalCase exports.
- No default exports except Next's required ones (`page.tsx`, `route.ts`, `layout.tsx`).
- Types over interfaces unless declaration merging is needed.
- Zod schema names end in `Schema`; the inferred type takes the bare name.
- Errors are typed results, not thrown, anywhere inside `lib/`. Throwing is for
  programmer error only.
- Every `lib/detect/*` module exports a single pure function with the shape
  `(fileContents: string, path: string) => RawSignal[]`. No I/O inside detectors.
  Exceptions: `paths.ts` takes `(paths: string[])`, because it reads presence rather than
  contents, and `signal.ts` and `image-ref.ts` are shared helpers, not detectors.
- Signal ids are `<ecosystem>:<name>` (ADR-0015). Build them with `signal()`, never by
  hand.
- Tailwind classes only on the site. The card is inline styles inside Satori — Satori does
  not run Tailwind.

---

## Testing expectations

Tests are cheap here because almost everything is a pure function. There is no excuse for
untested parsing.

1. **Detector tests.** Each `lib/detect/*` module against real fixture files. Table-driven.
2. **Normalizer snapshot tests.** Eight fixture repos, including at least one pnpm
   monorepo, one Go repo, one Python repo, and one repo with no recognizable manifest.
   Fixtures are committed JSON — no network in the test run, ever.
3. **Map integrity test.** Every map entry has a non-empty `id`, `display`, `category`;
   no duplicate ids; every string in `suppresses` resolves to an existing id; no entry
   appears in both the map and the deny list.
4. **Render determinism test.** Render the same `StackDoc` twice, assert byte equality.
   Then assert the sha256 matches a committed snapshot. This is how invariant I2 stays
   true.
5. **Budget test.** A resolve against fixtures asserts the GitHub API call counter never
   exceeds 2. (Invariant I6.)

No Playwright, no component tests for the single page. If you want to add E2E, open an ADR
first.

Run `pnpm test` before proposing a commit. If a snapshot changed, say so explicitly in the
commit message and explain why the change is correct.

---

## Standing instruction: the decision log

**Whenever you make a non-obvious choice, write it down in the same change.**

Two destinations:

- **`DECISIONS/NNNN-slug.md`** — an architectural or product choice where a reasonable
  engineer would have picked differently. Use the existing template: context, options
  considered, decision, consequences, revisit triggers. Number sequentially. Never edit a
  past ADR's decision; supersede it with a new one and add a `Superseded by` line to the
  old.
- **`GOTCHAS.md`** — anything that surprised you, any bug that took more than an hour, any
  non-obvious failure mode, any place the docs were wrong. Include what it cost. This file
  is the raw material for the public writeup, so a terse honest entry written at the time
  is worth more than a polished one written later.

If a change alters an invariant in `ARCHITECTURE.md`, update that file in the same commit.
Invariants that drift out of date are worse than no invariants.

When unsure which destination: a choice goes in `DECISIONS/`, a surprise goes in
`GOTCHAS.md`.

---

## Session protocol

Context gets cleared. `ROADMAP.md`'s **Current state** block is the only thing that
survives it, so it has to be true.

**At the start of a session:** read this file, `ARCHITECTURE.md`, and `ROADMAP.md`. Work
the task named in Current state. State the plan and wait for confirmation before writing
code.

**At the end of a session, before anything is cleared:**

1. Update the Current state block in `ROADMAP.md`.
2. Add anything surprising to `GOTCHAS.md`, with its real cost in hours.
3. Write the ADR if a non-obvious call was made.
4. Produce a five-line handoff for the next session.

Prefer clearing at a milestone boundary rather than mid-task. Resuming across a
half-finished detector is where context loss actually costs something.

---

## Scope discipline

This project is budgeted at three weekends. The following are out and do not get built,
prototyped, or accommodated "for later": user accounts, saved cards, ~~custom themes~~,
private repos, comparison mode, an iframe embed, a public API, and any CMS for the stack
map.

**"Custom themes" is amended by ADR-0029**, which adds a fixed, curated set of card styles
chosen in the URL. There is still no theme editor and no user-supplied values: a style is
one of a handful of names we ship. Everything else on this list stands.

**Analytics is in scope but tightly bounded** — Redis counters, a weekly embed count, and
Vercel Web Analytics, exposed as JSON behind a secret. See ADR-0012. No dashboard, no
third-party product analytics, no session recording, no funnels. Do not remove the
counters; do not expand them.

If a task appears to require one of these, stop and say so rather than building toward it.

@AGENTS.md
