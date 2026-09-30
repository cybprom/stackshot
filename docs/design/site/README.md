# Site directions — design handoff

Three directions for the whole site, drawn at 1440px desktop width. Only one gets built;
ROADMAP records which. Each `.dc.html` is plain HTML with inline styles and a small
logic class at the bottom, so every value and timing is exact.

| File | Direction | In one line |
|---|---|---|
| `a-playground.dc.html` | Playground | Light, bold type, layer colours as decoration; the generator is the hero. |
| `b-terminal-session.dc.html` | Terminal session | The site is a shell: the headline types itself, options are CLI flags. |
| `c-gallery-wall.dc.html` | Gallery wall | Real cards drift behind a floating panel; on Generate the panel widens to show the card beside the controls. |
| `a-playground-phone.dc.html`, `c-gallery-wall-phone.dc.html` | Phone versions | 390px. On C the panel can't widen, so the card appears inside it, under the button. |

## What all three share

- The generator: paste a repo, style switcher (Tiles, Terminal — the launch styles),
  Light / Dark / System preview toggle, and the loading sequence from
  `../directions/preview.dc.html` (dim, sweep, per-style reveal).
- The snippet block with a copy button whose label confirms the copy.
- A GitHub link with the live star count. `[stars]` in the files is a placeholder:
  fetch it server-side and cache it, never from the visitor's browser (rate limits).
- A footer link for suggesting missing technologies, pointing at GitHub issues, beside the logo.
- "Does it know your stack?": a searchable, layer-filtered index of the map (A and C). The files hold a sample; the real one renders every map entry, and a no-match result links to GitHub issues.
- `prefers-reduced-motion` turns every animation off.

## Porting notes

- Page sizes here are real CSS pixels. Unlike the card files, do not double them.
- IBM Plex Mono stands in for Commit Mono.
- A and C have phone versions; B does not yet.
- The example stacks in the files are from our fixtures; the live site uses real
  resolve output.
- C's drifting wall needs real card data at build time. Render its cards from a fixed
  list of well-known repos, cached, so the homepage never waits on GitHub.

## Behaviour decided after review

- **C opens by generating Stackshot's own card.** About 0.9s after load, the panel runs
  Generate on `cybprom/stackshot` and widens. Serve that card from cache so the intro is
  instant and costs no GitHub budget. Under reduced motion, the page loads already
  expanded with the card showing.
- **The preview area animates its height.** When a new card is taller or shorter, the
  container eases between heights (measure the content, set an explicit height, transition
  it). Width changes on C's panel animate the same way.
- **The wall must be taller than the tallest hero.** Each column holds eight distinct
  cards, duplicated for the loop, so no gap appears when a large card grows the panel.
- **The technology index shows two to three rows, then "Show all N".** Search and the
  layer filter are the real navigation; "Show all" expands in place. No pagination, and no
  scrolling box inside the page.
- **Tiles previews use the three-row cap**, the same allocation as the renderer.
