# GitHub fixtures

Each directory holds `responses.json`, keyed by `"METHOD url"`, served by
`tests/helpers/fixture-fetch.ts`. Recorded with `scripts/record-github.ts` on 2026-09-22.

Trees over 256 KB are **reduced**. Only root entries, every candidate manifest
(denied paths included) and workflows are kept, and the `truncated` flag is untouched.
The recorder refuses to write unless the full tree and the reduced tree select the same
manifests. A reduced tree is derived data: it is not the full listing GitHub returned.

| Directory | What it is | Recorded or derived |
|---|---|---|
| `Grandbusta__spyde` | One-dependency npm library plus docs site | Recorded |
| `vercel__next.js` | pnpm monorepo, 32,826 entries | Recorded, **tree reduced** (12.7 MB → 0.28 MB) |
| `fastapi__full-stack-fastapi-template` | Python backend in `backend/`, JS frontend | Recorded |
| `pocketbase__pocketbase` | Go | Recorded, **tree reduced** |
| `astral-sh__uv` | Rust workspace plus pyproject | Recorded, **tree reduced** |
| `mastodon__mastodon` | Ruby, Dockerfile, compose | Recorded, **tree reduced** |
| `laravel__laravel` | PHP | Recorded |
| `github__gitignore` | **CI signals only**: one workflow, no manifests | Recorded |
| `jlevy__the-art-of-command-line` | **No manifest and no workflows** | Recorded |
| `Grandbusta__stackshot-fixture-missing-repo` | GraphQL's 200 + `repository: null` + `NOT_FOUND` | Recorded |
| `derived__empty-repo` | spyde's GraphQL body with `defaultBranchRef: null` | **Derived** |
| `derived__truncated-tree` | spyde with `truncated: true` and every root blob removed | **Derived** |
