import { DEFAULT_STYLE, type CardStyle } from "@/lib/card-style";
import type { StackDoc } from "@/lib/stack-map/types";
import { CARD, TYPE, type Theme } from "@/lib/tokens";

/**
 * What a preview draws from. `unmapped` is logged and never returned by `/api/resolve`,
 * so the page has never had it and the previews must not ask for it.
 */
export type PreviewDoc = Omit<StackDoc, "unmapped">;

/**
 * The site preview's arithmetic, render-free and testable. The components that use it are
 * in `app/preview/`; everything here is a number or a string, so it can be checked without
 * a DOM. ADR-0032.
 */

/**
 * What the site offers. Tiles and Terminal launch; the Datasheet becomes selectable once
 * it has an HTML preview, and Tags once it has a renderer at all. A style with no HTML
 * here would make the switcher write a PNG per press, which is the cost ADR-0029's second
 * implementation exists to avoid.
 */
export const LAUNCH_STYLES = ["tiles", "terminal"] as const satisfies readonly CardStyle[];

export type LaunchStyle = (typeof LAUNCH_STYLES)[number];

export function isLaunchStyle(value: string): value is LaunchStyle {
  return (LAUNCH_STYLES as readonly string[]).includes(value);
}

/**
 * Where the switcher starts: the site's default, narrowed to a style the site can draw.
 * One default rather than two, so the first card shown is the one the snippet would carry.
 */
export const DEFAULT_LAUNCH_STYLE: LaunchStyle = isLaunchStyle(DEFAULT_STYLE)
  ? DEFAULT_STYLE
  : LAUNCH_STYLES[0];

/**
 * The toggle is preview-only: the snippet always emits `<picture>` with both themes, so
 * System is the real README behaviour and the other two are a convenience.
 */
export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

// The labels live in `lib/site.ts` with every other site string, not here.
export function resolveTheme(mode: ThemeMode, systemDark: boolean): Theme {
  if (mode === "system") return systemDark ? "dark" : "light";
  return mode;
}

/**
 * The HTML preview draws at the card's own 1200-unit canvas and is scaled by one number,
 * so every token value is used at 1:1 and the two implementations cannot diverge by
 * arithmetic. A second scale anywhere in `app/preview/` defeats the whole arrangement.
 */
export const PREVIEW_WIDTH = CARD.width;

export function plateScale(width: number): number {
  if (!(width > 0)) return 1;
  return width / PREVIEW_WIDTH;
}

/** A 1200-unit card, measured, becomes this tall on the plate. Also the eased height. */
export function plateHeight(cardHeight: number, scale: number): number {
  return Math.round(cardHeight * scale);
}

/**
 * `TYPE` holds the family names Satori is given, which are the names registered with it
 * rather than anything a browser knows. The site loads the same TTFs through `next/font`,
 * which hashes the family name and hands back a variable. This map is the only place the
 * two naming schemes meet; `tests/preview.test.ts` keeps literals out of the previews.
 */
type CardFamily = (typeof TYPE)[keyof typeof TYPE]["family"];

const FONT_VAR: Record<CardFamily, string> = {
  Archivo: 'var(--font-archivo), "Helvetica Neue", Arial, sans-serif',
  "Commit Mono": 'var(--font-commit-mono), ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace',
};

export function family(name: CardFamily): string {
  return FONT_VAR[name];
}

/**
 * Milliseconds of no style change before the real PNG is requested, from
 * `docs/design/directions/preview.dc.html`'s pacing. Flipping through the switcher costs
 * nothing; settling on one costs a render and zero GitHub budget. ADR-0032.
 */
export const PNG_SETTLE_MS = 700;

/**
 * Per-style reveal timings, as drawn. Tiles pop in staggered across the grid; Terminal
 * prints its rows in order and ends on the cursor. Durations live in CSS, delays here,
 * because the delay is per item and the duration is not.
 */
export const REVEAL = {
  tile: { first: 120, step: 45 },
  row: { first: 200, step: 150 },
} as const;

export function tileDelay(index: number): number {
  return REVEAL.tile.first + index * REVEAL.tile.step;
}

/** The legend and the domain arrive after the last tile, not with the frame. */
export function legendDelay(tiles: number): number {
  return REVEAL.tile.first + 40 + tiles * REVEAL.tile.step;
}

export function rowDelay(index: number): number {
  return REVEAL.row.first + index * REVEAL.row.step;
}

/** The cursor blinks once the last row has printed, which is what ends the sequence. */
export function cursorDelay(rows: number): number {
  return rowDelay(rows);
}
