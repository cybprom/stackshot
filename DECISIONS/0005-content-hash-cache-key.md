# ADR-0005: Cache renders by content hash, not commit SHA

**Status:** Accepted
**Date:** 2026-09-21

## Context

The brief said to cache by repo plus commit SHA. That is the obvious key and it is
slightly wrong.

## Options considered

**A — Key on `{owner}/{repo}@{sha}`.**
Simple, obviously correct, and invalidates precisely. But most commits do not change the
stack. A README typo, a test fix, a dependency patch bump all produce a new SHA and
therefore a full re-detection and two re-renders, for a pair of images that are
byte-identical to the ones already cached — and which Camo will not refetch anyway.

**B — Key the render on `sha256(stableStringify(StackDoc))`. Keep a short-lived
repo→{sha, stackHash} pointer.**
A push that doesn't change the stack costs two API calls and two cache hits. A push that
does change it produces a new hash and renders.

## Decision

B. The commit SHA is the _lookup_; the content hash is the _render key_.

This is only correct because the renderer is a pure function of `StackDoc` (invariant I2).
The two decisions support each other: purity makes content-hashing safe, and
content-hashing is the reason purity is worth enforcing.

## Consequences

- Two identical stacks in different repos share a rendered card only if owner, repo name,
  stars and language also match — those fields are in the `StackDoc`, so in practice
  sharing never happens. The win is temporal, not cross-repo.
- ~~`asOf` cannot be part of the hash input, or every resolve produces a new key. It is~~
  **(ADR-0025 removed `asOf` entirely; the note below is kept for the record.)** It is
  therefore assigned once, on first write of a hash, and means "when this stack last
  changed" rather than "when this image was made". This turns out to be more useful.
- The repo pointer needs its own short TTL (1h) so a real stack change is picked up
  reasonably soon without hammering the API.
- Any non-determinism introduced into the renderer silently corrupts the cache. The
  determinism test is load-bearing and must never be skipped.

## What would make us revisit

- The determinism test becomes hard to keep green, e.g. a Satori upgrade changes
  sub-pixel output. At that point pin the Satori version into the hash input.
