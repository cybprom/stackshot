import { WALL_REPOS } from "@/lib/home";
import type { LaunchStyle } from "@/lib/preview";
import type { Theme } from "@/lib/tokens";

/**
 * The two page designs, built to be compared live rather than chosen on paper. An env var
 * picks the one that ships; `?layout=a` and `?layout=c` preview the other.
 *
 * **This is a fork with an expiry.** Phase 5 step 7 chooses one and deletes the other,
 * and this file goes with it — the layout choice, C's two timings and the wall's
 * allocation have no reader once there is one page.
 */
export const SITE_LAYOUTS = ["a", "c"] as const;

export type SiteLayout = (typeof SITE_LAYOUTS)[number];

export function isSiteLayout(value: unknown): value is SiteLayout {
  return typeof value === "string" && (SITE_LAYOUTS as readonly string[]).includes(value);
}

/**
 * Which hero to render. The query parameter wins so either layout can be looked at on the
 * deployment serving the other, which is the whole point of building both.
 */
export function siteLayout(override?: string | string[]): SiteLayout {
  const asked = Array.isArray(override) ? override[0] : override;
  if (isSiteLayout(asked)) return asked;
  const configured = process.env.NEXT_PUBLIC_SITE_LAYOUT;
  return isSiteLayout(configured) ? configured : "a";
}

/**
 * C's panel opening to two columns. The duration lives in `globals.css` with every other
 * one; this is the number the intro waits for, exactly as `PLATE_HEIGHT_MS` is the number
 * the crossfade's third gate waits for.
 *
 * The plate inside the panel must **not** ease its own height while this runs. Its
 * `ResizeObserver` reports the widening frame as a resize, which snaps — if the height
 * eased too it would trail the frame by 400ms and the card would tear away from its edge.
 * GOTCHAS 057 is the same trap with `width` substituted.
 */
export const PANEL_WIDTH_MS = 560;

/** How long C waits before drawing its own card. Long enough to be read as a page first. */
export const INTRO_DELAY_MS = 900;

/**
 * C's two panel widths, and the left column's inside it. The panel grows and the column
 * shrinks at the same time, which is what moves the form out of the centre and makes room
 * for the card beside it rather than under it.
 *
 * They are `max-width`, so a viewport narrower than the open panel simply gets less of it
 * and the hero degrades to one column without a second set of numbers.
 */
export const PANEL_WIDTH = { closed: 660, open: 1300 } as const;

export const PANEL_COLUMN = { closed: 580, open: 432 } as const;

/** The gap between the panel's two columns, and the padding around both. */
export const PANEL_GAP = 40;
export const PANEL_PAD = 40;

/**
 * How wide the card's column is, as CSS the browser resolves without measuring anything.
 *
 * **It must not depend on the panel's current width**, which is the whole point. The card
 * mounts while the panel is still opening, and a column sized as "whatever is left" is
 * zero wide at that moment: the plate would measure zero, fall back to scale 1, draw a
 * 1200-unit card into a 700px frame and rely on a `ResizeObserver` to walk it back —
 * re-rendering the whole card tree on every frame of the transition, and showing a
 * clipped card until the first delivery lands.
 *
 * So it is derived from the viewport instead, which does not move while the panel opens.
 * The column is its final width from the first frame, the panel's `overflow: hidden`
 * holds it off-screen until there is room, and the plate measures once. A genuine window
 * resize still goes through the observer, and still snaps.
 */
export const panelCardWidth = (): string =>
  `calc(min(${PANEL_WIDTH.open}px, 100vw - ${PANEL_PAD * 2}px) - ${PANEL_PAD * 2 + PANEL_COLUMN.open + PANEL_GAP}px)`;

export const WALL_COLUMNS = 4;

/** Eight per column, so the shortest column is still taller than the tallest hero. */
export const WALL_ROWS = 8;

export type WallSlot = { ref: string; style: LaunchStyle; theme: Theme };

/**
 * The drifting wall behind C's panel: every repo in `WALL_REPOS` twice, dealt so that no
 * column shows one twice and no two columns run the same order.
 *
 * A column's first half comes from its own quarter of the list and its second half from
 * the quarter two columns over, rotated by the column index. Each repo therefore appears
 * in exactly two columns, which is what fills 32 slots from 16 docs without the wall
 * reading as one card repeated. `tests/hero.test.ts` asserts all of it, including that the
 * list still divides into four — adding a seventeenth repo fails there rather than
 * silently dropping it off the wall.
 */
export function wallColumns(repos: readonly string[] = WALL_REPOS): WallSlot[][] {
  const size = Math.floor(repos.length / WALL_COLUMNS);

  return Array.from({ length: WALL_COLUMNS }, (_unused, column) =>
    Array.from({ length: WALL_ROWS }, (_row, row) => {
      const pass = Math.floor(row / size);
      const group = (column + pass * (WALL_COLUMNS / 2)) % WALL_COLUMNS;
      const within = (row + column) % size;
      return {
        ref: repos[group * size + within] as string,
        // Style flips every row and the theme every two, so neither tracks the other and
        // a column never reads as one card alternating.
        style: ((column + row) % 2 === 0 ? "tiles" : "terminal") satisfies LaunchStyle,
        theme: ((Math.floor(row / 2) + column) % 2 === 0 ? "dark" : "light") satisfies Theme,
      };
    }),
  );
}
