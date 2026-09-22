# ADR-0018: A version comes from the entry's own package, not from what implies it

**Status:** Accepted
**Date:** 2026-09-22

## Context

ADR-0016 lets drivers, SDKs and plugins imply an entry: `pypi:psycopg` implies
PostgreSQL, `gem:aws-sdk-core` implies AWS, and `npm:laravel-vite-plugin` implies Vite.
ADR-0017 then merges every backing signal's version. The first real cards showed what
that combination does:

- fastapi: **PostgreSQL 3**, which is psycopg's version
- mastodon: **AWS 1**, **Redux 9** (react-redux, not redux), **Prometheus 2** (a gem)
- uv: **MkDocs 9**, which is mkdocs-material
- pocketbase: **SQLite 1**, the Go driver
- next.js: **Vercel 3**, which is `@vercel/analytics`

Each is a real number attached to the wrong thing, which is worse than no number.

## Options considered

**A — Take versions only from the alias whose id matches the entry's id.** It breaks down
immediately: `react` and `react-dom` are one entry with two valid version sources, and
`docker:postgres` is the only right source for PostgreSQL.

**B — A per-entry `versionFrom` list of alias patterns whose versions count.** Omitted
means all aliases count, which is correct for most entries. `["docker:*"]` suits databases
and brokers, whose image tag is the server version. `[]` suits hosted services and umbrella
packages, where no single number means anything.

**C — Drop versions for every implied entry.** It loses PostgreSQL 14 from mastodon's
compose file, which is exactly the version worth showing.

## Decision

B. Set on 49 entries:
- databases and brokers: `["docker:*"]`
- hosted platforms, SDK-backed services and multi-package umbrellas (Radix, Lucide,
  Hotwire, Testing Library): `[]`
- entries that alias plugins or companions: their own package only (Vite, Redux, MkDocs,
  Tailwind, Drizzle, SQLAlchemy and similar)

The integrity test checks that every `versionFrom` pattern matches one of the entry's own
aliases.

## Consequences

- Fewer versions on cards, and every one that remains is the thing's own version.
- A database with only a driver (no compose or Dockerfile) shows no version. That's the
  honest answer: the driver doesn't say which server it talks to.
- One more field to get right per entry. The failure mode is a wrong number, which is
  only caught by reading cards, so step 5's judgement pass reads versions too.

## What would make us revisit

- A card in the judgement set where a missing version reads as a defect rather than
  honesty.
- An entry needing a version source that no alias pattern can express.
