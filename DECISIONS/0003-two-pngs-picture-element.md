# ADR-0003: Two themed PNGs delivered via `<picture>`, not one SVG

**Status:** Accepted
**Date:** 2026-09-21

## Context

The card must work on GitHub's light and dark themes. GitHub proxies every README image
through Camo, which fetches the image once, sanitizes it, caches it, and serves it from
its own infrastructure.

## Options considered

**A — One SVG with `prefers-color-scheme` media queries inside it.**
Elegant in principle. Dead in practice: Camo sanitizes SVG, `@font-face` is stripped so
our custom type does not load, and media queries inside a proxied image do not evaluate
against the viewer's preference. This does not work.

**B — One PNG with an opaque background and a border.**
Works everywhere, one render, one simple `![]()` snippet. But an opaque light card in a
dark README (or the reverse) reads as a foreign object pasted into the page. It looks worse
on both themes than a dedicated card looks on either.

**C — Two PNGs, selected by an HTML `<picture>` element with
`media="(prefers-color-scheme: dark)"`.**
GitHub supports this and documents it. Costs two renders per stack and an uglier snippet
to copy.

**D — The `#gh-dark-mode-only` URL fragment.**
Removed by GitHub. Not an option.

## Decision

C. The rendering cost is irrelevant because everything is cached, and the snippet's
ugliness is a one-time copy-paste that the site generates for the user.

## Consequences

- Two renders and two cache entries per `stackHash`. Cheap.
- The copy button produces an HTML block rather than markdown, which is slightly more
  intimidating to paste. The site must show it pre-formatted and make copying one click.
- `<picture>` is HTML inside markdown. It works in GitHub READMEs but not in every markdown
  renderer (npm's README display, some docs sites). The site should offer a plain
  `![]()` fallback pointing at the dark card as a secondary option.
- Theme switching depends on the viewer's OS preference, not their GitHub theme setting.
  A user with a light OS and dark GitHub will see the light card. Nothing can be done about
  this, and it should be stated in the README's limitations.

## What would make us revisit

- Milestone 0 shows `<picture>` failing to switch on the GitHub mobile apps. Then B, and
  the whole card gets redesigned around one opaque background.
- GitHub ships a documented theme-aware image mechanism.
