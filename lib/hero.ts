import { WALL_REPOS } from "@/lib/home";
import type { LaunchStyle } from "@/lib/preview";

/** The panel's two widths and its left column's. The panel opens once, on the first Generate. */
export const PANEL_WIDTH = { closed: 660, open: 1220 } as const;

export const PANEL_COLUMN = { closed: 580, open: 440 } as const;

/** Width, height and copy all open on this one clock. */
export const PANEL_OPEN_MS = 520;

export const PANEL_GAP = 56;
export const PANEL_PAD = 40;

/**
 * The card column's width, from the viewport rather than the panel: the panel is still
 * opening when the card mounts, and a column sized from it measures zero. GOTCHAS 060.
 */
export const panelCardWidth = (): string =>
  `calc(min(${PANEL_WIDTH.open}px, 100vw - ${PANEL_PAD * 2}px) - ${PANEL_PAD * 2 + PANEL_COLUMN.open + PANEL_GAP}px)`;

/** Six columns of ordinary-sized cards, so the outer ones run off the edge at any width. */
export const WALL_COLUMNS = 6;

export const WALL_ROWS = 8;

/** How far each column travels per pixel scrolled, and how far it starts above the band. */
export const WALL_DRIFT = [
  { rate: 0.12, offset: 60 },
  { rate: 0.08, offset: 150 },
  { rate: 0.16, offset: 20 },
  { rate: 0.1, offset: 110 },
  { rate: 0.14, offset: 40 },
  { rate: 0.09, offset: 130 },
] as const;

export type WallSlot = { ref: string; style: LaunchStyle };

// Each pair of columns covers the list once, so sixteen repos fill 48 slots three times
// each. The stride of five stops a column reading as one ecosystem.
const WINDOW_STARTS = [0, 8, 4, 12, 2, 10] as const;
const STRIDE = 5;

/** The wall's cards: every repo three times, never twice in a column. */
export function wallColumns(repos: readonly string[] = WALL_REPOS): WallSlot[][] {
  return WINDOW_STARTS.map((start, column) =>
    Array.from({ length: WALL_ROWS }, (_row, row) => ({
      ref: repos[((start + row) * STRIDE) % repos.length] as string,
      style: ((column + row) % 2 === 0 ? "tiles" : "terminal") satisfies LaunchStyle,
    })),
  );
}
