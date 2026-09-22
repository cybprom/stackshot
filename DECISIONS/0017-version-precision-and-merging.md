# ADR-0017: Version precision per entry, and how several versions merge into one

**Status:** Accepted
**Date:** 2026-09-22
**Amends:** ADR-0008

## Context

ADR-0008 says to display major versions only. That's right for Next.js 15 or Rails 8, and
wrong for three toolchains whose major hasn't moved in years: every Go card would say
"Go 1", every Python card "Python 3", every Rust card "Rust 1". A version that's the same on
every card carries no information.

Separately, one entry is often backed by several signals with different versions:
`engines.node: ">=20"` and `FROM node:24` both resolve to Node. ADR-0008 never said which
one wins.

## Options considered

**A — Major everywhere, dropping the version for Go/Python/Rust.** Honest, but it loses
the one number a reader of a Go or Python card actually wants.

**B — A per-entry `versionPrecision`, "major" by default and "minor" where the major is
constant.** The data says where it applies, and the normalizer stays generic.

**C — Minor everywhere.** "Next.js 15.1" churns the stack hash on every minor release
across the whole map for detail nobody reads at thumbnail size.

## Decision

B, set to "minor" for `go`, `python` and `rust` only. The integrity test pins that list.
Ruby and PHP stay major: "Ruby 3" and "PHP 8" are coarse but not constant, and they can be
revisited on the same terms.

Merging, when several signals carry versions for one entry:

- **A concrete version beats a floor.** `>=20` is what the project tolerates; `node:24` is
  what it runs. Concrete means exact pins, `^`, `~`, `~=`, `~>`, bare versions and Docker
  tags. A floor is a lower bound that's open or only upper-capped: `>=`, `>`,
  `>=3.14,<4.0`.
- **When two concrete versions disagree, take the higher.** Two different pins usually mean
  a monorepo mid-migration, or a Dockerfile ahead of `engines`. The higher one is what at
  least part of the project already runs, so it's the better statement of "what this is
  built on".
- **With only floors, take the highest floor.** It's the binding constraint.
- **Semver 0.x:** for a major of 0, the minor is the breaking component, so `0.8` is shown
  as `0.8` at either precision. A `0.0.x` version shows no version: at that point every
  patch is breaking, and no digit summarizes it honestly.
- Non-numeric specs (`*`, `latest`, git and URL refs, unresolved Docker tags) contribute
  no version, as in ADR-0008.

## Consequences

- **Minor precision means a minor bump changes the `StackDoc`, and so the stack hash, for
  those three entries.** Go 1.26 → 1.27 re-renders a Go card. This is accepted: they
  release a few times a year, and it's the version the reader wants.
- "Higher wins" can show a version that only part of a monorepo uses. It's still a true
  statement about the repo.
- A floor still renders as a bare number ("Node 20" from `>=20`). That's ADR-0008's
  existing honesty gap, and the README's limitations section should mention it.

## What would make us revisit

- A real card where "higher wins" reads wrong, e.g. a stale Dockerfile pin outranking the
  version the project actually targets.
- Ruby or PHP cards that look uniform in practice ("Ruby 3" everywhere): move them to
  minor.
