# GitHub fixtures

Each directory holds `responses.json`, keyed by `"METHOD url"`, served by
`tests/helpers/fixture-fetch.ts`. Recorded with `scripts/record-github.ts`.

| Directory | Source |
|---|---|
| `Grandbusta__spyde` | Recorded 2026-09-22 at `8ea92b3`. |
| `Grandbusta__stackshot-fixture-missing-repo` | Recorded 2026-09-22. GraphQL's 200 + `repository: null` + `NOT_FOUND`. |
| `derived__empty-repo` | **Derived**, not recorded: spyde's GraphQL body with `defaultBranchRef: null`. |
| `derived__truncated-tree` | **Derived**, not recorded: spyde's responses with `truncated: true` and every root blob removed from the tree. |
