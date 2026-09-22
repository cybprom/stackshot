# ADR-0015: Signal ids are namespaced by ecosystem; Docker and CI are extracted generically

**Status:** Accepted
**Date:** 2026-09-22

## Context

Detectors may import only `lib/stack-map/types`: they cannot see the map, so they emit raw
names and normalization resolves them. Two problems follow.

1. **One name, two ecosystems.** `redis` is an npm client, a PyPI client, a gem and a Docker
   image. `requests` is a Python staple and an unrelated, deprecated npm package. A bare
   `id: "redis"` can't tell them apart, and deny patterns like `@types/*` or
   `eslint-config-*` are npm conventions that shouldn't match in other ecosystems.
2. **Where the Docker and CI curation lives.** ARCHITECTURE.md planned regexes matched
   "against a signal list" (`actions/setup-go` → `go`), with ADR-0001 warning that more than
   ~40 regexes means we're writing a parser badly. That puts curation in two places: the
   regex list and the map.

## Options considered

**A — Bare ids, with collisions handled in the map.** Least typing. Collisions are silent,
and the deny list can't be scoped.

**B — Namespaced ids (`npm:next`, `pypi:django`, `go:github.com/gin-gonic/gin`,
`cargo:tokio`, `gem:rails`, `composer:laravel/framework`, `docker:postgres`,
`action:actions/setup-go`, `tool:pnpm`) plus generic extraction.** Detectors emit every
`FROM` image, every compose `image:` and every `uses:` action, and the map decides which
ones render.

**C — Namespaced ids, but keep the curated regex list for Docker and CI.** Two places to
edit for one technology, and a list that grows toward the 40-entry warning.

## Decision

B. `id = "<ecosystem>:<name>"`, built by `lib/detect/signal.ts`. **Map entry ids stay bare**
(`next`, `postgres`), and their `aliases` list namespaced signal ids (`npm:next`,
`docker:postgres`), so `StackDoc` ids don't change. `tool:` covers everything a manifest or
the tree says about the toolchain rather than a dependency: `engines.node`,
`packageManager`, `requires-python`, the `go` directive, `rust-version`, composer's `php`,
and root lockfiles and monorepo configs.

Rules that make generic extraction usable:
- **Image names are normalized before emitting.** `postgres`, `docker.io/postgres` and
  `docker.io/library/postgres` are all `docker:postgres`. Other registries keep their host
  (`ghcr.io/owner/app`). Digests are stripped.
- **Dockerfile ARG defaults are substituted.** mastodon writes
  `FROM ${BASE_REGISTRY}/node:${NODE_MAJOR_VERSION}-…`. Without substitution it emits
  nothing. Unresolved variables drop the version, or the whole image if the name is
  unresolved. References to earlier build stages are skipped.
- **Action refs aren't versions.** `actions/setup-node@v4` says which version of the
  *action* is used, not which version of Node, so no version is emitted. Local actions
  (`./…`) and reusable workflows (`owner/repo/.github/workflows/x.yml`) aren't tools and
  are skipped.
- **The repo's own packages are skipped at the source.** That means npm `workspace:`,
  `file:`, `link:` and `portal:` ranges, and Cargo `path` dependencies. Otherwise every
  monorepo's own package names would flood the unmapped log.

## Consequences

- **The unmapped log will fill with long-tail actions** (`actions/upload-artifact`,
  `swatinem/rust-cache`, `codspeedhq/action`…) and project images
  (`ghcr.io/mastodon/mastodon`). ADR-0006 treats that log as the backlog, so the namespace
  is what keeps it usable: filter by `action:` or `docker:` to see CI noise, or by `npm:`
  to see missing packages.
- Map aliases are more verbose: `aliases: ["npm:@prisma/client", "npm:prisma"]`. The map
  integrity test in step 3 must check that every alias has a known namespace.
- The deny list becomes namespaced (`npm:@types/*`), which is more precise.
- The ~40-regex warning in ADR-0001 no longer applies to Docker or CI, since there is no
  per-technology regex list. The detectors have a fixed handful of line patterns each.
- A Docker tag like `24-trixie-slim` goes to normalize as the raw version, and ADR-0008's
  major-version coercion handles it.

## What would make us revisit

- The unmapped log is dominated by `action:` noise to the point of hiding real packages,
  even with filtering. The fix would be an action deny list, not a return to curated
  regexes.
- A real repo where one technology really needs two namespaces merged in a way aliases
  can't express.
