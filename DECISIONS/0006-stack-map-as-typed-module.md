# ADR-0006: The stack map is a typed TS module in the repo, maintained by PR

**Status:** Accepted
**Amended by:** ADR-0016 (v1 is sized to each ecosystem's head, 223 entries, not ~120)
**Date:** 2026-09-21

## Context

The curated dependency → category + display name + description map is the actual product
work here. It is a data problem, not a code problem, and how it is maintained determines
whether the project stays a weekend or becomes a system.

## Options considered

**A — A database or CMS with an admin UI.**
Editable without a deploy, and a natural home for community contributions. Also: a schema,
an auth story, an admin interface, and a runtime dependency on the data being available.
It turns a static site into an application. Wildly disproportionate.

**B — A JSON file.**
Simple, but no type checking, no autocomplete, no compile-time validation of the
`suppresses` references, and no way to leave a one-line note on a contestable
classification.

**C — Typed TS modules under `lib/stack-map/entries/`, split by category, assembled at
build time, validated by a test.**
Type-checked, autocompleted, diffable, reviewable, zero runtime dependency. Changing an
entry requires a deploy.

## Decision

C. Requiring a deploy to edit the map is a feature, not a limitation — it means every
change is reviewed and versioned, and the map is exactly the kind of thing where a careless
edit (miscategorizing Prisma, a bad `suppresses` entry) degrades every card at once.

The entry shape:

```ts
type MapEntry = {
  id: string;
  display: string; // "Next.js"
  category: Category;
  weight: number; // ranking within its layer
  description: string; // one line, site only
  suppresses?: string[]; // ids this entry makes redundant
  aliases?: string[]; // other manifest names that resolve here
};
```

`suppresses` is the highest-leverage field in the project. `next` suppresses `react` and
`react-dom`. `nuxt` suppresses `vue`. `tailwindcss` suppresses `postcss` and
`autoprefixer`. `vite` suppresses `esbuild` and `rollup`. This is the difference between a
card that reads as a stack and one that reads as a dependency dump.

## Consequences

- v1 is capped at ~120 entries. That covers the long head of what appears in real repos;
  the tail is infinite and not worth chasing.
- **Every unmapped package id is logged with a counter.** That log is the backlog, sorted
  by demand, and it costs nothing to maintain. It is also the project's only real usage
  metric, given Camo makes view counting impossible.
- The integrity test (no duplicate ids, every `suppresses` target exists, no entry also in
  the deny list) must exist from the first entry, not added later.
- Community contributions become PRs against a TS file, which is a completely normal
  open-source contribution shape.
- Categorization is subjective and will be argued about. Entries with contestable
  classifications carry a one-line comment explaining the call — the only place in the
  codebase where explanatory comments are encouraged.

## What would make us revisit

- The map passes ~400 entries and reviewing PRs against it becomes a chore.
- A second product needs the same data, at which case it becomes a package.
