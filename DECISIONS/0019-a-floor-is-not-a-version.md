# ADR-0019: A floor alone is not a version

**Status:** Accepted
**Date:** 2026-09-23
**Amends:** ADR-0017

## Context

ADR-0017 ranked a concrete version above a floor and, with only floors, took the highest
floor. Reading the step-5 cards showed what "only floors" produces:

- **zustand**: `engines.node ">=12.20.0"`, workflow `node-version: 'lts/*'`. The card said
  **Node 12**. zustand is not built on Node 12; 12 is the oldest runtime it still tolerates,
  from a field almost nobody updates.
- **uv**: `requires-python ">=3.8"` gave **Python 3.8**, while uv's own CI runs much newer.
- **spyde**: `engines.node ">=20"` *and* a workflow pinning `node-version: 20` gave
  **Node 20**, which is right — but only by coincidence, since the floor happened to match.

A floor answers "what will still run this", which is a compatibility claim. The card
answers "what is this built with". Printing the first as the second is wrong more often
than it is right, and it is wrong in the direction that makes a modern project look stale.

## Options considered

**A — Keep the highest floor.** Every card keeps a number. The number is a lower bound
presented as a fact, which is the bug above.

**B — Show no version unless a concrete source exists.** Honest. Costs versions across
Python especially, where PEP 508 specs are nearly always `>=x,<y`.

**C — Mark floors on the card ("Node ≥20").** Accurate, but it spends card width on a
distinction a reader scanning a thumbnail does not want, and DESIGN.md's item type has no
room for a prefix glyph.

## Decision

B. `mergeVersions` returns a version only when a concrete source backs it. Floors still
rank (a concrete source always wins), and they still appear in provenance, but they never
render alone.

**Alongside it, workflow `with:` inputs are now read**, because that is where a concrete
pin often lives: `node-version: 20`, `go-version: '1.27.1'`, `python-version: '3.13'`.
Only keys that name a toolchain are read (`node-version`, `python-version`, `go-version`,
`ruby-version`, `php-version`, `bun-version`, `deno-version`, `java-version`). The bare
`version:` key is deliberately excluded: it means the action's own version for
`setup-uv`, `goreleaser-action` and most others. Values that are not versions — `lts/*`,
`stable`, `latest`, `${{ matrix.node }}` — produce a signal with no version, so the tool
still appears.

## Consequences

- **Python cards lose most versions.** `>=0.141.1,<1.0.0` is a floor, so fastapi's card
  drops FastAPI, Pydantic, Alembic, pytest, Ruff and Python to bare names. uv loses
  Python, Ruff, Black and MkDocs. This is the honest reading of those manifests, and it is
  the single biggest visible cost of the rule.
- A bounded range like `>=3.14,<4.0` pins the major as firmly as `^3.14` does, and this
  rule still drops it. Treating "floor with an upper bound" as concrete is the obvious
  revisit if Python cards read as broken rather than honest.
- Node versions now come from CI more often than from `engines`, which is a better source:
  a workflow pin is what the project actually runs.
- Cards get quieter. A name with no version says "we know this is here, we do not know
  which version", which is true.

## What would make us revisit

- The judgement pass finds Python or Ruby cards read as defective without versions.
- A repo whose only concrete source is a CI matrix (`node-version: [20, 22]`), which this
  does not parse. Today it yields no version, which is correct but leaves a real pin on
  the floor.
