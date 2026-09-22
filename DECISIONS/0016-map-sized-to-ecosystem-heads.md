# ADR-0016: The v1 map covers each ecosystem's head, not a fixed ~120 entries

**Status:** Accepted
**Date:** 2026-09-22
**Amends:** ADR-0006 (its "v1 is capped at ~120 entries" consequence)

## Context

ADR-0006 sized v1 at ~120 entries. That figure predates ADR-0015's namespaces and step
2's detectors, which read nine ecosystems: npm, PyPI, Go, Cargo, RubyGems, Composer,
Docker, Actions, and toolchain signals. About 120 entries covers the JS head alone, and it
would leave a Rails, Laravel or Go card mostly blank. The nine fixture repos are a
checklist, not the scope: a map built only from them would fit nine cards and fail the
tenth.

## Options considered

**A — Hold at ~120, JS-weighted.** Least review. Every non-JS card goes sparse, which is
exactly ADR-0001's "fails on the first repo anyone tries" problem, one ecosystem over.

**B — Map what appears in most real projects in each ecosystem: its frameworks, ORMs,
databases (through their drivers), test runners, linters, package managers and deploy
targets.** Then use each fixture's emitted list to check its important signals are mapped.

**C — Chase the long tail.** Unbounded, and it's the backlog's job (ADR-0006).

## Decision

B. v1 lands at 223 entries (59 frontend, 90 backend, 21 infra, 53 tooling). The mechanics
that keep it one table:

- **Aliases are exact namespaced ids, or a prefix ending in `*`** (`npm:@radix-ui/*`,
  `go:github.com/labstack/echo*` for `/v4` and `/v5`). Exact matches win; otherwise the
  longest prefix wins. The integrity test checks that every alias resolves back to its own
  entry.
- **Drivers imply the database.** `npm:pg`, `pypi:psycopg`, `gem:pg`, `go:…/pgx*` and
  `docker:postgres` all resolve to PostgreSQL. A project that installs the driver runs the
  database somewhere, and the card should say so.
- **"Uses Docker" and "uses GitHub Actions" are signals of their own** (`tool:docker`,
  `tool:github-actions`), emitted once per Dockerfile, compose file or workflow. DESIGN.md's
  card shows both, and nothing emitted them before.
- **The deny list is for known noise and is never logged**: type packages, lint and
  transpiler plumbing, CI plumbing actions like `actions/checkout`, and base OS images. The
  unmapped log stays a backlog of real technologies.

## Consequences

- Nearly twice the entries to review, and a larger surface for misclassification. Each
  contestable call carries a one-line note in its entry, as CLAUDE.md asks.
- A card for Rails, Laravel, Django, FastAPI, Go or Rust has real content, not just a
  language badge.
- The map describes what exists, not what ranks. Nine fixtures show that mapped isn't the
  same as worth showing: next.js maps Firebase, Datadog and Emotion from its root
  devDependencies. That's the normalizer's and step 5's problem, by weight and the 6-item
  cap, not something to fix by leaving entries out.
- Rust's long tail stays unmapped (uv emits 187 unmapped crates). That's correct: they're
  libraries of a library, and the backlog will show whether any of them earns an entry.

## What would make us revisit

- The unmapped log shows a head technology we missed appearing across many repos.
  Add it.
- Review of the map becomes the bottleneck on shipping. Cut back toward the ecosystems the
  fallback plan keeps (ROADMAP: JS/TS and Python first).
- An entry proves wrong on a real card twice. Reclassify it and note why in the entry.
