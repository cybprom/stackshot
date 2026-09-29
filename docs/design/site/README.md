# Site directions — design handoff

Three directions for the whole site, drawn at 1440px desktop width. Only one gets built;
ROADMAP records which. Each `.dc.html` is plain HTML with inline styles and a small
logic class at the bottom, so every value and timing is exact.

| File | Direction | In one line |
|---|---|---|
| `a-playground.dc.html` | Playground | Light, bold type, layer colours as decoration; the generator is the hero. |
| `b-terminal-session.dc.html` | Terminal session | The site is a shell: the headline types itself, options are CLI flags. |
| `c-gallery-wall.dc.html` | Gallery wall | Real cards drift behind a floating panel; the page shows the product first. |

## What all three share

- The generator: paste a repo, style switcher (Tiles, Terminal — the launch styles),
  Light / Dark / System preview toggle, and the loading sequence from
  `../directions/preview.dc.html` (dim, sweep, per-style reveal).
- The snippet block with a copy button whose label confirms the copy.
- A GitHub link with the live star count. `[stars]` in the files is a placeholder:
  fetch it server-side and cache it, never from the visitor's browser (rate limits).
- A footer link for suggesting missing technologies, pointing at GitHub issues.
- `prefers-reduced-motion` turns every animation off.

## Porting notes

- Page sizes here are real CSS pixels. Unlike the card files, do not double them.
- IBM Plex Mono stands in for Commit Mono.
- These are desktop only. Mobile layouts still need designing.
- The example stacks in the files are from our fixtures; the live site uses real
  resolve output.
- C's drifting wall needs real card data at build time. Render its cards from a fixed
  list of well-known repos, cached, so the homepage never waits on GitHub.
