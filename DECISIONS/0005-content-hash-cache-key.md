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

## Amendment, 2026-09-27: `RENDER_VERSION` in the `png:` key

The consequence above — *"any non-determinism introduced into the renderer silently
corrupts the cache"* — had a mirror image that this ADR missed, and it is the more likely
one. The danger is not only that the bytes change when the input did not. It is that the
bytes change **on purpose** and the key does not.

`png:{stackHash}:{theme}` is keyed on the *content of the stack*, and a design change
alters none of it. Ship a new accent colour, a new font, a corrected layout, and every
repo already in the cache keeps serving the old card for the rest of its 30-day TTL. The
content hash is doing exactly what it was designed to do, and the effect is a design
change that reaches new repos and no existing ones — the worst version, because the
inconsistency is invisible from the inside.

The key is therefore `png:v{RENDER_VERSION}:{stackHash}:{theme}`, with `RENDER_VERSION` a
constant in `lib/tokens.ts`. Bumping it retires every stored PNG at once.

**What makes this happen rather than get forgotten** is `tests/render-hash.test.ts`, which
pins each card's sha256 to a committed value. A deliberate design change fails it, and the
failure message says to bump `RENDER_VERSION` and regenerate the hashes in the same
commit. The test is not a guard on the version; it is the thing that forces the question
to be asked at the only moment anyone can answer it.

Two notes on scope:

- `stack:` and `repo:` are **not** versioned. They hold data, not rendered output, and
  their content is already either content-addressed or short-lived.
- All three spaces **are** namespaced by deployment (`{VERCEL_ENV}:…`), which is a
  different problem with a similar shape. See GOTCHAS 043.

## What would make us revisit

- The determinism test becomes hard to keep green, e.g. a Satori upgrade changes
  sub-pixel output. At that point pin the Satori version into the hash input. Note that as
  of 2026-09-27 output is byte-identical across Linux x64 and macOS arm64, so the hashes
  do not need a designated authority machine; if that ever stops being true, CI on ubuntu
  becomes the authority and the local test skips on a mismatched platform.
