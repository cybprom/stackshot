# ARCHITECTURE.md

---

## The shape of the problem

Stackshot is a pipeline with one network phase at the front and a pure function at the
back. Everything interesting about the design follows from keeping that boundary sharp:

```
  network  ──▶  data  ──▶  pure render  ──▶  bytes  ──▶  CDN  ──▶  Camo  ──▶  reader
           (unreliable)  (deterministic)              (cached)   (opaque)
```

The last hop is the one that makes this project non-trivial. GitHub proxies every README
image through **Camo** (`camo.githubusercontent.com`), which fetches your image once,
caches it, sanitizes it, and serves it from its own infrastructure. The reader never
touches your server. That single fact drives four decisions: PNG not SVG, two images not
one, no runtime theme detection, and no per-view telemetry.

---

## System

```
                        ┌──────────────────────────────┐
   browser ────────────▶│  GET /                       │
                        │  one page, RSC + client form │
                        └───────────┬──────────────────┘
                                    │ POST /api/resolve { url }
                                    ▼
            ┌───────────────────────────────────────────────────┐
            │  RESOLVER                                         │
            │                                                   │
            │   1  parse owner/repo, reject non-github hosts    │
            │   2  KV get repo:{owner}/{repo}        ───────┐   │
            │   3  GraphQL repo head: commit, root [api 1]  │   │
            │   4  GET /git/trees/{tree}?recursive=1 [api 2]│   │
            │   5  select <=6 manifest paths from tree      │   │
            │   6  fetch manifests from raw.github  [raw]   │   │
            │  ─────────────── no network below ─────────   │   │
            │   7  detect:   contents -> RawSignal[]        │   │
            │   8  normalize: map, suppress, deny, rank     │   │
            │   9  emit StackDoc                            │   │
            └───────────────────────┬───────────────────────┼───┘
                                    │                       │
                     stackHash = sha256(stable(StackDoc))   │
                                    │                       │
                ┌───────────────────┴───────────┐           │
                ▼                               ▼           │
     ┌─────────────────────┐        ┌───────────────────────┴──┐
     │ KV  repo:{o}/{r}    │        │ KV  stack:{stackHash}    │
     │ { sha, stackHash }  │        │ StackDoc (incl. asOf)    │
     │ ttl 1h              │        │ ttl 30d                  │
     └─────────────────────┘        └──────────────────────────┘


   GET /{owner}/{repo}/card-dark.png
                │
                ▼
     ┌──────────────────────────────────────────────┐
     │  CARD ROUTE                                  │
     │   a  resolve (as above, cache-first)         │
     │   b  KV get png:{stackHash}:{theme}          │
     │   c  miss -> render, then KV set             │
     │   d  always 200, always image/png            │
     └──────────────────┬───────────────────────────┘
                        │  Cache-Control: public,
                        │  s-maxage=86400,
                        │  stale-while-revalidate=604800
                        ▼
                  Vercel CDN ──▶ Camo ──▶ reader
```

### Render stage, isolated

```
   StackDoc + theme
          │
          ▼
   ┌──────────────────────────────────┐
   │ satori(cardElement, {            │
   │   width: 1200, height: 800,      │
   │   fonts: [Archivo, CommitMono]   │   fonts read at module scope
   │ })                  -> SVG       │
   ├──────────────────────────────────┤
   │ resvg(svg, { zoom: 2 })          │   2x for small-type crispness
   │                     -> PNG bytes │
   └──────────────────────────────────┘
          │
          ▼
   deterministic bytes  (invariant I2)
```

---

## Boundaries

| Module | May import | Must never import |
|---|---|---|
| `lib/github/*` | nothing in `lib/` except types | detectors, normalizer, render |
| `lib/detect/*` | `lib/stack-map/types` | anything that does I/O |
| `lib/normalize` | `lib/stack-map`, detect types | `lib/github`, `lib/render` |
| `lib/render/*` | `lib/tokens`, StackDoc type | `lib/github`, `lib/cache` |
| `app/**/route.ts` | everything | — |

The rule in one sentence: **only route handlers know that a network exists.**

This is what makes the whole parsing and rendering surface testable from committed
fixtures with no network in the test run, and it is what makes the render cacheable by
content hash.

---

## Data model

```ts
type Category = "frontend" | "backend" | "infra" | "tooling";

type RawSignal = {
  id: string;           // "next", "postgres", "github-actions"
  rawVersion?: string;  // "^15.1.0", "22-alpine", undefined
  source: string;       // "package.json", "Dockerfile", ".github/workflows/ci.yml"
  confidence: 1 | 2;    // 2 = declared dependency, 1 = inferred from CI/Docker
};

type StackItem = {
  id: string;
  display: string;      // "Next.js"
  version?: string;     // "15"  — major only
  description: string;  // shown on the site, never on the card
};

type StackLayer = {
  category: Category;
  items: StackItem[];   // <= 6
  overflow: number;     // count hidden behind "+N more"
};

type StackDoc = {
  owner: string;
  repo: string;
  language: string | null;
  stars: number;
  layers: StackLayer[]; // <= 4, empty layers omitted
  asOf: string;         // ISO date, see below
  unmapped: string[];   // logged, never rendered
};
```

### `asOf`, and why it isn't "now"

The footer date must not be the current time, because that would make the render
non-deterministic and break I2. It is set **once**, the first time a given `stackHash` is
written to KV, and travels with the document thereafter.

The consequence is honest and actually more useful than a generation timestamp: the card
reads *"stack as of 2026-03-14"*, meaning **the date this project's stack last changed**.
A repo that hasn't touched its dependencies in eight months says so.

`asOf` is excluded from the hash input. Hashing it would make every resolve produce a new
key and defeat the cache entirely.

---

## Detection strategy

Scope is "(b-minus)" — see ADR-0001. The substrate is one recursive Trees API call, which
returns every path in the repo in a single response, preceded by one GraphQL query for the
commit to pin to (ADR-0014).

**Manifest selection, priority-ordered, budget of 6 fetches:**

1. `package.json` at root
2. `pyproject.toml` · `requirements.txt` · `go.mod` · `Cargo.toml` · `Gemfile` ·
   `composer.json` at root
3. `Dockerfile` / `docker-compose.yml` at root
4. The first file matching `.github/workflows/*.y?ml`
5. Remaining `package.json` files **and nested language manifests** (`pyproject.toml`,
   `requirements.txt`, `go.mod`, `Cargo.toml`, `Gemfile`, `composer.json` below the root)
   in one pool, shallowest path first, ties by code-unit path order. Without nested language
   manifests, a Python backend beside a JS frontend never gets read. GOTCHAS 026.

Paths are skipped if any directory segment is `node_modules`, `examples`, `example`,
`fixtures`, `test`, `tests`, `__tests__`, `e2e`, `samples`, `demo`, `templates`, `bench` or
`vendor` (case-insensitive), and blobs over 1 MB are skipped. Without the segment list,
vercel/next.js gives every remaining slot to `examples/`, which sorts before `packages/`.
`docs/` is deliberately allowed. GOTCHAS 024.

**Timeouts.** Every GitHub and raw fetch has a 2.5s timeout inside a 4s resolve deadline,
so the ~2.4s cold render measured in M0 still fits under 8s. That 8s is our working
estimate from the M0 plan, **not a measured Camo fetch timeout**. A hang becomes a
`timeout` result and an error card; without the deadline, it would hold the route until
Vercel's limit and Camo would show a broken image, breaking I5 in practice while every code
path returns 200. ADR-0014.

**Union every `package.json` found.** No workspace glob resolution, no `pnpm-workspace.yaml`
parsing, no `turbo.json` parsing. The tree already tells us where the package.json files
are; resolving globs would give us the same set with more code. `pnpm-workspace.yaml` and
`turbo.json` are used only as *signals* that the repo is a monorepo, which gets rendered
as a tooling item.

**Dockerfile and workflows are regex-matched against a signal list, never parsed.**
`FROM node:22` → `node@22`. `image: postgres:16` → `postgres@16`. `actions/setup-go` →
`go`. `uses: supabase/setup-cli` → `supabase`. If the regex list grows past ~40 entries,
that is a sign this should have been scope (a).

**Never parse a lockfile.** A dependency that appears only in a lockfile is transitive, and
transitive dependencies are noise. This is a hard rule, not a v1 shortcut.

---

## Normalization

```
RawSignal[]
   │
   ├─ drop: anything matching the deny list
   │        (@types/*, eslint-config-*, eslint-plugin-*, prettier-plugin-*,
   │         @babel/*, tslib, typescript-eslint, husky, lint-staged)
   │
   ├─ drop: anything with no entry in STACK_MAP  ──▶ push to unmapped[], log
   │
   ├─ suppress: for each surviving entry, remove every id in entry.suppresses
   │            next        suppresses  react, react-dom
   │            nuxt        suppresses  vue
   │            nestjs      suppresses  express, reflect-metadata
   │            vite        suppresses  esbuild, rollup
   │            tailwindcss suppresses  postcss, autoprefixer
   │
   ├─ version: coerce range -> major integer, or drop
   │
   ├─ rank within category: entry.weight desc, then confidence desc, then id asc
   │
   └─ slice to 6, record overflow count
```

Suppression is the highest-leverage piece of the whole product and it is pure data. It is
the difference between a card that says "Next.js, React, React DOM, Webpack, PostCSS" and
one that says "Next.js". See ADR-0006.

---

## Caching

Three layers, each with a different job.

| Layer | Key | TTL | Purpose | Adds staleness? |
|---|---|---|---|---|
| KV repo pointer | `repo:{owner}/{repo}` | 1h | Skip the two API calls | **yes, 1h** |
| KV stack doc | `stack:{stackHash}` | 30d | Skip detection, hold `asOf` | no — content-keyed |
| KV rendered png | `png:{stackHash}:{theme}` | 30d | Skip the render | no — content-keyed |
| CDN (Vercel edge) | the URL | `s-maxage=86400`, `swr=7d` | Skip the function entirely | **yes, and it dominates** |
| Fastly + Camo | the URL | **our `max-age`** | Honours the header we send · ADR-0013 | yes, our value |
| Browser | the URL | our `max-age` | — | yes, our value |

**End-to-end staleness is the maximum over this chain, and the dominant term is ours, not
Camo's.** The content-hash keys (ADR-0005) mean the KV render caches never serve stale
content — a changed stack produces a different key. The edge does: it is keyed by URL, and
a repo's stack changing involves no deploy of ours to invalidate it. Tuning Camo's
`max-age` while leaving `s-maxage=86400` in place buys refetch traffic and nothing else.
Milestone 2 sets the chain as a whole.

The render key is the **content hash, not the commit SHA**. A README typo produces a new
SHA but an identical `stackHash`, so it costs one cheap API call and zero renders. See
ADR-0005.

**Negative caching.** A 404 repo or a repo with no manifests is cached for 10 minutes under
the same scheme. Without this, a badge pointing at a deleted repo re-runs full detection on
every cold CDN request.

**Camo's TTL was measured in Milestone 0 and there isn't one.** Camo honours the origin's
`cache-control` and passes it through to the reader, so propagation delay is the remaining
TTL of whatever it already holds — a number we set. `PURGE` against a Camo URL also works.
Embedded cards are **not** immutable, and the planned README limitation is not needed. The
downstream value is a product parameter, deferred to Milestone 2. See ADR-0013 and
GOTCHAS 008.

There is also a **Fastly layer in front of Camo**, so the real chain is origin → Vercel edge
→ Fastly → Camo → browser. Four caches, not two.

---

## Invariants

These hold at all times. A change that breaks one requires an ADR.

- **I1** — A badge URL never contains a commit SHA. Badges are branch-pinned and resolved
  server-side, so an embedded card follows the repo instead of freezing.
- **I2** — The renderer is pure. The same `(StackDoc, theme)` produces byte-identical PNG
  output. Verified by a test that renders twice and compares hashes.
- **I3** — A `StackDoc` contains zero unmapped entries. Unknown ids are dropped into
  `unmapped[]` and logged; they are never rendered.
- **I4** — At most 4 layers, at most 6 items per layer. Overflow is a count, never a
  smaller font or a scroll.
- **I5** — The card route always returns HTTP 200 with `content-type: image/png`. Every
  failure path renders an error card. A broken-image icon in a stranger's README is the
  worst outcome this project can produce.
- **I6** — No request path makes more than **2 authenticated GitHub API calls**: one
  GraphQL query and one REST tree call, and the counter counts both. Manifest contents come
  from `raw.githubusercontent.com` pinned to the resolved commit, which consumes neither
  bucket. The only exception is the `/git/blobs` fallback, which raises that request's
  ceiling to 8. Enforced by a per-request counter in `lib/github/client.ts` that throws
  `BudgetExceededError` past the budget (programmer error; see the failure table), and
  asserted in tests. ADR-0014.
- **I7** — Fonts are read from disk at module scope and embedded in the deployment. Never
  fetched at request time.
- **I8** — `lib/render/` has no import path that reaches a network call.

---

## Failure modes

| Failure | Detection | Response |
|---|---|---|
| Repo not found / private | GraphQL **200** with `repository: null` + `NOT_FOUND` — read the body, not the status | Error card: "Repo not found or private" · negative cache 10m |
| Empty repo | `defaultBranchRef: null` | `empty_repo` → the no-manifests error card |
| Trees response `truncated: true` | Flag in response | Top up with the root entries from call 1 (no extra call); mark doc `partial` |
| No recognizable manifest | Empty signal set | Error card naming the manifests Stackshot reads |
| Every signal unmapped | Empty `StackDoc.layers` | Error card; log all ids — this is the backlog |
| GitHub rate limit exhausted | 403/429 + `x-ratelimit-remaining: 0`, or GraphQL `RATE_LIMITED` | Serve last-known card from KV if present, else error card · alert |
| Secondary rate limit | 403/429 + `retry-after` | Same as above; `resetAt` from `retry-after` |
| GitHub or raw hangs | Per-fetch 2.5s / resolve 4s deadline | `timeout` → error card, well inside the 8s estimate |
| A code path exceeds the call budget | `BudgetExceededError` **thrown** — a bug, not a GitHub failure | Passes through `lib/` untouched; the route's top-level catch logs it on a separate bug counter (not the failure-by-reason counts) and renders an error card, so I5 holds |
| Satori throws on a glyph | Exception in render | Error card; log the package name and the glyph |
| `raw.githubusercontent.com` throttles | Non-200 (not 404) or timeout on raw fetch | Fall back to `/git/blobs` (costs API budget, raises that request's ceiling to 8); skipped once the deadline has passed |
| Card route used as a free proxy | Per-IP counter | 429 on the JSON API; the PNG route serves a rate-limit card |

---

## Rate limiting and abuse

The badge route is a public endpoint that triggers work against a shared quota. Treat it
as an open proxy until proven otherwise.

- A classic PAT gives 5,000 REST requests/hour and, separately, 5,000 GraphQL points/hour.
  A cold resolve costs 1 of each, so that is ~5,000 cold resolves/hour, before any
  caching. Read the budget from response headers, not `/rate_limit` (GOTCHAS 025). Caching should make the real number an order of
  magnitude lower.
- Per-IP limit on `POST /api/resolve`: 20/hour. The site is the only legitimate caller.
- The PNG route is not IP-limited in the normal case (Camo is a small set of IPs and
  limiting it would break the product) but it **hard-refuses to resolve a repo it has never
  seen if the global budget is below 10%**, serving a "try again shortly" card instead.
- Unmapped package names are logged with a counter. This log is both the abuse signal and
  the product backlog.

---

## Routing note

The card lives at `/{owner}/{repo}/{file}` where `file` is `card-light.png` or
`card-dark.png`. Owner is a root-level dynamic segment, which collides with any future site
route.

Mitigations, both required:
1. A reserved-word deny list for `owner`: `api`, `_next`, `favicon.ico`, `robots.txt`,
   `sitemap.xml`, `about`, `docs`.
2. The site stays at exactly `/` and `/api/*`. Adding a second page means moving the card
   route under a prefix first.

---

## What this architecture deliberately does not do

- **No git clone.** Everything comes from the API and raw file fetches.
- **No AST parsing.** Regex and JSON/TOML parsing only.
- **No database.** KV is a cache; losing all of it costs latency, not data.
- **No queue.** Renders are fast enough to do inline. If they aren't, that is a Milestone 0
  failure and the fix is a pre-warm, not a queue.
- **No edge runtime.** `@resvg/resvg-js` is a native binary. Everything is CDN-cached
  anyway, so edge buys nothing. See ADR-0004.
