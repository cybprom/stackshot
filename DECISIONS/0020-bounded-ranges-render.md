# ADR-0020: A bounded range renders when its bound pins what we display

**Status:** Accepted
**Date:** 2026-09-24
**Amends:** ADR-0019

## Context

ADR-0019 suppressed any version not backed by a concrete source. That was over-broad.
`>=3.14,<4.0` is not a floor in any useful sense: it pins the major as firmly as `^3.14`
does. Under ADR-0019 a Python card lost its Python version, and a card with no Python
version on a Python project reads as broken rather than honest.

The distinction is not floor-versus-pin. It is whether the upper bound constrains the
digits the card would actually print, which depends on the entry's precision (ADR-0017).

## Decision

A floor renders when every version its range admits would display identically at this
entry's precision:

| Spec | Precision | Shows | Why |
|---|---|---|---|
| `>=3.14,<4.0` | major | `3` | everything in range is 3.x |
| `>=3.14,<4.0` | minor | — | spans 3.14 through 3.x |
| `>=3.3.4,<4.0.0` | major | `3` | psycopg on fastapi |
| `>=0.141.1,<1.0.0` | major | — | 0.x displays its minor, and it spans 0.141 to 0.999 |
| `>= 3.3.0, < 4.1.0` | major | — | spans 3.x and 4.0.x |
| `>=12.20.0` | any | — | unbounded |
| `>=20` | any | — | unbounded |

Mechanically: take the components `formatVersion` would print, increment the last one, and
require the upper bound to sit at or below that. Only versions that render compete in the
merge, so an unbounded floor never outranks a bounded range that would have shown
something.

## Consequences

- Python and Ruby cards keep versions where the manifest genuinely pins them:
  fastapi's Alembic reads `1` again from `>=1.19.1,<2.0.0`.
- Entries pinned only by a 0.x range still show nothing, because 0.x displays its minor
  and those ranges span hundreds of minors. fastapi's FastAPI (`>=0.141.1,<1.0.0`) and
  SQLModel stay bare, which is correct: the project accepts any 0.x.
- spyde keeps `Node 20` from its CI pin, and zustand still shows `Node` with no version
  from `>=12.20.0`. Both were the cases ADR-0019 was written for.
- The rule is precision-aware, so changing an entry's `versionPrecision` can change
  whether its version renders at all. That coupling is in one function and is tested.

## What would make us revisit

- A range shape this gets wrong in the wild, e.g. `>=1.2,<1.9` at minor precision, which
  correctly shows nothing today but might read better as `1`.
