# Writeup shortlist

Milestone 4's last step: `GOTCHAS.md` read through for the post, 2026-11-12. Of 71 entries,
about 55 flag themselves as writeup material, which is several posts. This is the cut for
one. Entry numbers are `GOTCHAS.md` sections, and the full detail stays there.

## A shape for the post

1. **The constraint nobody sees.** GitHub never shows your image to a reader; Camo does.
   That one fact decides the format, the theming and the analytics. Spine: 001, 002, 008
   with 019, 013.
2. **Numbers that looked fine.** Every size was reasonable in the card's 1200-unit space and
   wrong at 0.29px per unit on a phone. 012, 014 and 022 are one story, told best together.
3. **Reading a repo honestly.** A manifest says what a repo declares, not what it ships.
   034 ("Node 12" was a floor, not a version), 030 (Firebase on the Next.js card), 032
   ("PostgreSQL 3"), 024 (path order handing Next.js's slots to `examples/`).
4. **The best finding.** 059: a library's own card never names the library. React's card
   doesn't say React. One sentence, and it changed which repos went on the homepage.
5. **Building the card twice.** The HTML preview exists to be compared with the PNG, and the
   comparison kept catching things: 052, 055, 063, then 065, where "the PNG jump" turned out
   to be a status line.
6. **What launch measured.** 071: 65 real repos, no timeouts, one map gap. It also settles
   027, which was waiting on production numbers.

## The ten strongest, in order

| # | Entry | Why it earns a place |
|---|---|---|
| 1 | 059 | The best single finding. Concrete, surprising, one sentence. |
| 2 | 001 | The spine. Everything else follows from Camo. |
| 3 | 012 + 014 + 022 | "The numbers looked fine", with a real ending on a phone. |
| 4 | 034 | The clearest case of a true number that is not the answer. |
| 5 | 008 + 019 | The most quotable measurement: how long Camo holds an image, and why Vercel first sent it no TTL at all. |
| 6 | 064 | Invisible in the diff: a Tailwind class glued to an interpolation stops existing. |
| 7 | 044 | Found by pointing the tool at its own repo. |
| 8 | 065 | The fix aimed at the wrong thing until the page around it was measured. |
| 9 | 023 | A plan and its ADR that both read fine until the code was written. |
| 10 | 058 | A hang is worse than a crash, and this one looked like impatience. |

## Leave out

- **Flagged "no" or "minor":** 003, 005, 009, 045, 054, 062. True, and small.
- **Good, but a second post:** the Satori and font cluster (004, 015, 047, 053) and the
  ordering saga (024, 033, 049). Each is a story of its own, and the post only has room for
  one of each kind.
- **Process, not product:** 041 (a fix that took four days to land) and 043. Honest, but
  they are about the build, and the post is about the thing.

## Still open

- **Camo liveness (013, ADR-0012):** testable only with real embeds, about two weeks after
  launch. It is either a closing paragraph or a dropped idea, noted in `GOTCHAS.md` either
  way.
- **The embed count:** the first real numbers arrive with the first Monday run after launch.
  Quote the trend, never a single week.
