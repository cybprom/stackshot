# ADR-0023: The map says which technologies mean "test fixture" when dev-only

**Status:** Accepted
**Date:** 2026-09-25

## Context

ADR-0022 reverted a rule that dropped dev-only entries, because it removed VitePress from
spyde, Tailwind from laravel and MkDocs from uv — all three genuinely those projects'
frontends. But next.js still shows Firebase, Datadog, OpenTelemetry and Vercel's SDKs,
which are integration-test fixtures in its root `devDependencies`.

Reading every dev-only, non-tooling entry in the nine fixtures (thirteen in total, GOTCHAS
036) showed the distinction is a property of the **technology**, not of the manifest:

- Tailwind, Sass, VitePress and MkDocs are never runtime dependencies of anything.
  `devDependencies` is simply where they live, so dev scope says nothing about their role.
- Firebase, Datadog, OpenTelemetry, Vercel's SDKs, Express, Emotion, Typer and Redux are
  normally runtime dependencies. A dev-only declaration is the unusual case, and it means
  the repo is testing against them.

## Options considered

**A — `conventionallyDev` on the technologies that live in devDependencies**, dropping
everything else that is dev-only. Rejected on the direction of its failure: the default
becomes "drop", so any technology missing from the list is dropped. The list is a claim
about convention that no test can verify, and it is already known to be incomplete —
Svelte and SvelteKit are conventionally devDependencies while being a project's whole
frontend, and no fixture contains one. An incomplete list would cost a SvelteKit repo its
frontend layer, which is exactly the failure ADR-0022 reverted.

**B — `dropWhenDevOnly` on the technologies that are normally runtime dependencies**, and
keep everything else. The same claim about convention, pointed the other way: a missing
entry shows noise instead of losing a layer.

**C — Read `peerDependencies` to rescue the library case.** Not needed. React stays under B
because UI frameworks are unflagged, and a dev-declared UI framework almost always means
the project is about it. Peers also carry the wrong meaning for this: an optional peer says
"works with, pick any", so a Drizzle-shaped library would list every database it supports.
ADR-0015's signal model is untouched, and step 2's decision to skip peers stands.

## Decision

B. `dropWhenDevOnly: true` on a reviewable list of 44 entries, grouped by why they qualify:

- **Hosted services and observability** (infra): Vercel, Netlify, Cloudflare, AWS, GCP,
  Azure, Supabase, Firebase, Neon, Upstash, Sentry, OpenTelemetry, Datadog, Prometheus.
- **HTTP servers** (backend): Express, Fastify, Koa, Hono, Apollo Server, Socket.IO,
  Uvicorn, Gunicorn.
- **CLI frameworks**: Typer, Click, Cobra, clap.
- **HTTP clients**: Axios, HTTPX, Requests.
- **Service SDKs**: OpenAI, Anthropic, AI SDK, LangChain, Stripe.
- **CSS-in-JS runtimes** (frontend): Emotion, styled-components.
- **State and data-fetching libraries**: Redux, Zustand, Jotai, MobX, Pinia, TanStack
  Query, SWR, Apollo Client.

The rule is one line and has no guard: **dev-only, non-tooling and flagged means drop.**
Inferred signals (confidence 1, from CI, Docker or the tree) never make an entry
droppable, and a single runtime signal anywhere keeps it.

Deliberately unflagged: UI frameworks (React, Vue, Svelte, SvelteKit, Angular), build-time
CSS (Tailwind, Sass), docs generators (VitePress, MkDocs, Docusaurus), application
frameworks (Rails, Laravel, Django, FastAPI) and ORMs. A dev-declared framework usually
means the repo is a plugin or extension for it, and ORM command-line tools ship as
devDependencies beside a runtime client.

## Consequences

- All thirteen fixture cases come out right. spyde, laravel and uv keep their FRONTEND
  layers; zustand keeps React and loses Redux, which was there to test its redux
  middleware; next.js loses Emotion, Express and its four service SDKs, so its infra reads
  `GitHub Actions` and Sass surfaces in frontend.
- The list will be incomplete, and that is the point: a technology nobody flagged shows up
  as noise, which the reader can ignore, rather than removing a layer, which reads as a
  broken card.
- It is also a list that can be wrong in the other direction: flagging something that a
  repo legitimately dev-declares as its subject. The flagged set is deliberately narrow,
  and `tests/stack-map.test.ts` writes it out in full so a change has to be reviewed.
- next.js's SWR survives despite being flagged, because `apps/bundle-analyzer` declares it
  at runtime. That is the rule working: the flag only decides what a *dev-only* declaration
  means.

## What would make us revisit

- A real card that loses something real. The fix is to unflag that entry, one line, and the
  failure is visible rather than silent.
- A flagged technology appearing dev-only in a repo that is *about* it — a Sentry SDK
  wrapper, say. Unflag it or accept the miss.
