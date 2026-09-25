# ADR-0022: Dev-only entries are never dropped; ADR-0021 is reverted

**Status:** Accepted
**Date:** 2026-09-25
**Supersedes:** ADR-0021

## Context

ADR-0021 dropped manifest-dev-only entries outside tooling whenever the repo declared any
runtime dependency. It was argued on failure modes: the unguarded rule could empty a
library's layer, and the repo-level guard could not.

That argument was wrong, and the fixtures said so one commit later. The guard emptied a
layer on **three of nine** cards:

| Card | Layer lost | Entry | Is it real? |
|---|---|---|---|
| spyde | FRONTEND | VitePress | yes — it builds and publishes the docs site |
| laravel | FRONTEND | Tailwind | yes — Laravel puts Tailwind in devDependencies by convention |
| uv | FRONTEND | MkDocs | yes — it builds the published documentation |

The failure the guard was chosen to prevent — emptying a library's layer — occurs on one
fixture shape (zustand) and was already prevented. The failure it introduced occurs on
three, and produces exactly the same visible defect: a card missing a layer that belongs
on it. **The rule was selected on the rarer failure and shipped the commoner one.**

## Decision

Revert. Dev-only entries rank last (ADR-0017's scope rule) and are never dropped. next.js
keeps Firebase, Datadog and OpenTelemetry for now. A card with some noise beats a card
missing a real layer.

**The keep-the-top-entry patch is deliberately not applied.** It would restore VitePress
and Tailwind by coincidence — by refusing to empty a layer — not because anything in the
system understands what those packages are. A rule that produces the right cards for the
wrong reason fails on the first repo whose shape differs.

## Consequences

- next.js's infra reads `Vercel, Firebase, Datadog, OpenTelemetry, GitHub Actions`, three
  of which are integration-test fixtures. Known and accepted.
- The ranking work from ADR-0017 still stands: dev-only entries sort below runtime-backed
  ones, so they are the first to fall off the 6-item cap.
- `RawSignal.scope` remains load-bearing for ranking and for `runtimeOnly` entries, so
  nothing from the scope work is wasted.
- What separates the two groups is a property of the technology, not of the scope: see
  GOTCHAS 036 for the analysis across all nine fixtures and the two candidate signals it
  identifies.

## What would make us revisit

- A map-level property that says which technologies are conventionally dev-declared, plus
  a peer-dependency signal for the library case. Both are proposed in GOTCHAS 036 and
  neither is built.
