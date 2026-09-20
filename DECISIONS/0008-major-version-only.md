# ADR-0008: Display major versions only

**Status:** Accepted
**Date:** 2026-09-21

## Context

`package.json` does not contain versions. It contains **ranges**: `"^15.1.0"`, `"~4.2"`,
`"latest"`, `"workspace:*"`, `"github:owner/repo#branch"`. Rendering those directly
produces a card reading "Next.js ^15.1.0", which looks like unprocessed output.

## Options considered

**A — Print the range as written.**
Zero work, and it looks like a bug.

**B — Resolve the actual installed version.**
Requires a lockfile parse or an npm registry call per dependency. The lockfile is banned
(see ARCHITECTURE.md), and registry calls would add dozens of network hops per resolve for
information nobody is reading at thumbnail size.

**C — Coerce the range to its major version integer. Drop the version entirely when the
range is non-numeric.**

## Decision

C. `^15.1.0` → `15`. `~4.2.0` → `4`. `>=18` → `18`. `workspace:*`, `latest`, `*`, and git
refs → no version shown at all.

## Consequences

- The card reads "Next.js 15", which is how developers actually talk about versions and is
  what a reader wants to know. Nobody scanning a README card cares about the patch level.
- Patch and minor bumps do not change the `StackDoc`, so they do not change the
  `stackHash`, so they cost zero renders. This is a meaningful cache win and it falls out
  of the display decision for free.
- We are showing a _declared floor_, not an installed version. That is a small honesty gap
  and should be noted in the README's limitations.
- Docker tags coerce the same way: `node:22-alpine` → `Node 22`.
- Some items never carry a version (GitHub Actions, Vercel). The layout must handle a
  missing version gracefully — this is a layout requirement, not an edge case.

## What would make us revisit

- A convincing case that major-only is misleading for some ecosystem. Rust's 0.x
  convention is the likely candidate; `0.12` may need to display as `0.12`, not `0`.
