# ADR-0038: The button's label resolves character by character

**Status:** Accepted
**Date:** 2026-10-10

## Context

The generate button passes through three labels — "Generate card", "Reading repo",
"Drawing card" — and the change between the last two is the only visible sign that a
resolve has moved on. It was a plain text swap. The author asked for the label to resolve
into place instead, scrambling through punctuation and settling left to right, both on
that change and on hover.

DESIGN's MOTION section is a closed list of three things that animate, already extended by
four for the preview (ADR-0032). This is a fifth kind, so it needs recording rather than
adding quietly.

## Options considered

**A — The reference implementation.** `motion/react` for the press and hover scale, an
interval scrambling the button's text. Shortest path to the drawn effect.

**B — The effect without the library.** A pure frame function in `lib/`, an interval owned
by a hook, CSS for everything the library was doing.

**C — Decline it.** MOTION's list is closed and the label is legible without it.

## Decision

**B.** C is not available — the author asked for it, and the argument for it is real: the
reading→drawing change is the one moment the page has no other way to show progress.

A is not available either. `motion/react` is Framer Motion, which CLAUDE.md names
explicitly as out of scope for this project. Nothing in the sketch needs it: the scale on
press is a CSS transform, and the text is an interval.

**`lib/scramble.ts` holds the frame as a pure function of a tick**, like every other piece
of the site's motion arithmetic, and is tested — left-to-right resolution, length never
changing, the target reached at the last tick. The hook in `app/site/generator/` owns the
interval and the accessibility.

Four things the sketch did not do, each a real failure here rather than a nicety:

- **One run at a time.** Hovering during a phase change started a second interval over the
  first, and only the second was ever cleared. The first went on setting state at 28ms for
  the life of the page.
- **Cleared on unmount.** Layout C unmounts this button's column when the panel closes.
- **Keyboard too.** Focus starts it and blur ends it, or the effect is something a
  keyboard user is told about and cannot see.
- **The accessible name never scrambles.** `aria-label` carries the real words and the
  scrambling span is `aria-hidden`, so a screen reader is not read punctuation and the
  live region does not announce it. The run also skips entirely under reduced motion —
  this is decoration on a control whose text is the thing that matters.

**Spaces never scramble**, so the word shape holds and the eye reads one label turning into
another rather than a block of noise. The character set is punctuation only: a letter in it
would let a frame read as a different word for an instant.

## Consequences

- **MOTION's list grows by one**, and DESIGN carries the amendment line. "Nothing animates
  on initial page load" is untouched — the hook compares the previous label rather than
  tracking whether it has mounted, so Strict Mode's second effect invocation does not
  scramble a button nobody has touched.
- **The button needs a minimum width.** Three labels of different lengths pass through it
  and the scramble holds the target's length, so the width is stable within a run but not
  between them. Commit Mono does the rest; a proportional face would jitter every frame.
- **It is only really visible on the user's own path.** C's intro moves from reading to
  drawing in 560ms, which a slow first paint can swallow; a real resolve holds "Reading
  repo" for as long as GitHub takes, which is where the effect earns its place.
- `scrambleDuration` is asserted under a second for all three labels, so a label always
  settles before the next change can arrive.
