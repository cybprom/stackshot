# ADR-0021: Dev-only entries drop only when the repo ships something

**Status:** Accepted
**Date:** 2026-09-24

## Context

Scope (ADR-0017's `RawSignal.scope`) ranked manifest-dev-only entries last, but ranking is
not removal, and a layer with five entries shows all five. next.js's card carried Firebase,
Datadog and OpenTelemetry — root devDependencies it tests integrations against — as though
they were its infrastructure.

The first guard tried was per layer: drop dev-only entries only where that layer already
has a runtime-backed entry. It is inert exactly where the noise is worst, because a
monorepo root and a library have no runtime dependencies in any layer.

## Options considered

**A — Per-layer guard.** Never fires on next.js or zustand, the two cards that prompted it.

**B — No guard: drop manifest-dev-only entries everywhere.** Removes the noise, and
**empties zustand's frontend layer**: React and Redux are devDependencies, and a library
has nothing else. A card with a missing layer in a stranger's README is the failure this
project cares most about (I5's spirit).

**C — Repo-level guard: drop only when the repo declares at least one real runtime
dependency anywhere.** `engines.node` does not count; it is a declaration about the host,
not a dependency.

**D — Cap dev-only entries at two per layer.** Keeps bounded noise everywhere and needs a
number nobody can defend.

## Decision

C. A repo that declares no runtime dependency anywhere is a library, and its dev
dependencies are all it has. A repo that has runtime dependencies and still shows dev-only
entries in a layer is showing its tooling, not its stack.

**next.js losing Vercel is correct, not a cost.** `@vercel/*` in root devDependencies is
the CLI used to build and test the repo. Next.js does not run on Vercel — it is a
framework, and Vercel is one of its deployment targets. The same reasoning removes
Firebase and Datadog, which are integration test fixtures.

C was also chosen because **it fails recoverably**. It can under-drop: a repo with one
runtime dependency and a pile of dev tooling still shows some of that tooling. What it
does not do, unlike B, is strip a layer bare on a library, which is the failure that puts
a visibly broken card in someone's README. Given a choice between showing too much and
showing nothing, this project prefers too much.

## Consequences

- next.js: infra becomes `GitHub Actions` alone; frontend loses Tailwind, Emotion and
  Sass; backend loses Express. zustand is untouched, keeping React and Redux.
- **A repo that ships something can still lose a whole layer**, which C was supposed to
  avoid: spyde's frontend (VitePress, a docs devDependency) and laravel's frontend
  (Tailwind, a devDependency by Laravel convention) both vanish. See GOTCHAS 035; whether
  to add a "never empty a layer" exception is open.
- CI and Docker signals are exempt, as tooling is. They are inferred (confidence 1), not
  declared, and GitHub Actions is dev-scoped infra that belongs on the card by design.
- The guard reads the whole signal set, so it depends on which manifests were selected. A
  monorepo whose selected manifests happen to hold no runtime dependency behaves as a
  library.

## What would make us revisit

- GOTCHAS 035's layer-emptying cases, if the judgement pass says those cards read as
  broken.
- A repo where one incidental runtime dependency turns the guard on and strips the stack.
