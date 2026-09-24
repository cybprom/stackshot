# Decisions

Numbered ADRs. One file per non-obvious choice.

Rules:
- Number sequentially. Never reuse a number.
- **Never edit a past ADR's decision.** Supersede it with a new one and add a
  `**Superseded by:** ADR-00NN` line to the old file's status.
- Every ADR lists what it costs us. An ADR with no downsides listed wasn't thought about.
- "What would make us revisit" must contain concrete triggers, not "if requirements
  change".

Use `0000-template.md` as the starting point.

| # | Decision | Status |
|---|---|---|
| 0001 | Detection scope is "b-minus" — tree-driven, no glob resolution | Accepted |
| 0002 | Render technology names as type, not logos | Accepted |
| 0003 | Two themed PNGs via `<picture>`, not one SVG | Accepted |
| 0004 | `satori` + `@resvg/resvg-js` directly, on the Node runtime | Accepted |
| 0005 | Cache renders by content hash, not commit SHA | Accepted |
| 0006 | The stack map is a typed TS module, maintained by PR | Accepted |
| 0007 | Every failure on the card route returns 200 with an error card | Accepted |
| 0008 | Display major versions only | Accepted |
| 0009 | Per-technology descriptions live on the site, not on the card | Accepted |
| 0010 | A classic PAT for v1, manifests from raw.githubusercontent.com | Accepted |
| 0011 | Milestone 0 spike outcome — **go** | Accepted |
| 0012 | Measure embeds and intent, not views | Accepted |
| 0013 | Downstream `max-age` is the staleness lever for embedded cards | Accepted |
| 0014 | Call 1 is a GraphQL query, not REST `/repos` | Accepted |
| 0015 | Namespaced signal ids; Docker and CI extracted generically | Accepted |
| 0016 | The v1 map covers each ecosystem's head, not ~120 entries | Accepted |
| 0017 | Version precision per entry, and how several versions merge | Accepted |
| 0018 | A version comes from the entry's own package, not what implies it | Accepted |
| 0019 | A floor alone is not a version | Accepted |
| 0020 | A bounded range renders when its bound pins what we display | Accepted |
| 0021 | Dev-only entries drop only when the repo ships something | Accepted |

ADR-0011 records the spike's measured results and the go/no-go call. It exists, the call
was **go**, and it owes a teardown — see its final section.
