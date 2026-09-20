# ADR-0001: Detection scope is "b-minus" — tree-driven, no glob resolution

**Status:** Accepted
**Date:** 2026-09-21

## Context

Reading only the root `package.json` produces embarrassing output on real repos:
monorepos show one package's dependencies or none, non-JS repos show nothing,
infrastructure lives in Dockerfiles and CI configs, and devDependencies are often more
interesting than dependencies.

The brief offered two options: (a) scope explicitly to single-package JS/TS repos and say
so, or (b) full monorepo handling with workspace resolution, Dockerfile and CI parsing.

## Options considered

**A — Single-package JS/TS only, stated in the UI.**
Honest and fits comfortably in a weekend. But the tool fails on the first monorepo anyone
tries, and for a product whose whole point is distribution, a bad first impression is
expensive. "We only support simple repos" is a poor opening line.

**B — Full handling: resolve `pnpm-workspace.yaml` globs, parse `turbo.json`, parse
Dockerfiles and workflow YAML properly.**
Correct, and not a weekend. Glob resolution against a file tree, workspace protocol
handling, and real YAML workflow parsing (matrices, reusable workflows, composite actions)
would each eat hours.

**C — "b-minus": one recursive Trees API call as the substrate. Union every `package.json`
found anywhere in the tree, capped. Regex Dockerfiles and the first workflow file against
a curated signal list. No glob resolution, no YAML semantics, no lockfiles.**

## Decision

C. The recursive tree call gives us every path in the repo for one API call, which makes
glob resolution redundant — we already know where the manifests are. Unioning them is
simpler code than resolving workspaces and produces a near-identical result for the
purpose of "what is this project built with".

`pnpm-workspace.yaml` and `turbo.json` are read as _signals that this is a monorepo_, which
is itself worth rendering, rather than as configuration to interpret.

## Consequences

- A monorepo's card shows the union of all packages' stacks. For a repo with a Go service
  and a Next app, that is correct and interesting. For a repo with 40 packages it will be
  noisy, which the 6-item cap and the suppression rules mitigate.
- We cannot attribute a dependency to a specific package. Acceptable — the card has no
  place to show that anyway.
- The manifest fetch budget is 6, so very large monorepos are sampled, not surveyed. The
  priority order (root first, then shallowest) makes the sample the most representative
  one available.
- Regex-matched Docker/CI signals will have false positives. Confidence level 1 on those
  signals means they rank below declared dependencies and get cut first at the 6-item cap.

## What would make us revisit

- The signal regex list grows past ~40 entries — that means we are writing a parser badly
  and should either write it properly or drop the source.
- More than 2 of the 8 fixture repos produce a card that reads as noise.
- Someone asks for per-package cards, which is a different product.
