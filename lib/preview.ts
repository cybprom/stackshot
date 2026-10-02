import { DEFAULT_STYLE, type CardStyle } from "@/lib/card-style";
import { layoutTiles } from "@/lib/render/tiles-layout";
import type { StackDoc } from "@/lib/stack-map/types";
import { CARD, TYPE } from "@/lib/tokens";

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
 *
 * There is deliberately no `resolveTheme` here. **System is answered by a media query in
 * CSS**, never by script: a script cannot run before the first paint, so resolving it in
 * JavaScript renders the light card and corrects it a frame later. The labels live in
 * `lib/site.ts` with every other site string. GOTCHAS 056.
 */
export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

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
 * DESIGN's `motion/arrival`. The HTML and the PNG are the same card, so this is a
 * dissolve between two things that should already agree — a long one would be a feature
 * film of our own correctness.
 */
export const CROSSFADE_MS = 200;

/** Terminal's cursor fades before the crossfade starts, so the two never overlap. */
export const CURSOR_FADE_MS = 160;

/**
 * Per-style reveal timings, as drawn. Tiles pop in staggered across the grid; Terminal
 * prints its rows in order. Durations live in CSS, delays here, because a delay is per
 * item and a duration is not.
 *
 * The design file ends Terminal on a blinking cursor and this does not, because the
 * rendered card has no cursor: a preview that keeps one would differ from the PNG forever
 * and would read as drift in the crossfade, which is the one instrument that must not cry
 * wolf. The reveal is a way of arriving at the card, not a thing the card has.
 */
export const REVEAL = {
  tile: { first: 120, step: 45, duration: 460 },
  row: { first: 200, step: 150, duration: 320 },
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

/**
 * How many things a style reveals one at a time: cells for Tiles, layer rows for Terminal.
 * Tiles asks the renderer's own allocator, so the count the reveal paces is the count the
 * card draws.
 */
export function revealCount(style: LaunchStyle, doc: PreviewDoc): number {
  if (style === "terminal") return Math.min(doc.layers.length, 4);
  return layoutTiles(doc.layers.slice(0, 4)).reduce(
    (cells, layer) => cells + layer.items.length + (layer.hidden > 0 ? 1 : 0),
    0,
  );
}

/**
 * When the last thing on the card has finished arriving.
 *
 * This is the number the crossfade waits for: a PNG that decodes mid-reveal would dissolve
 * a card that is still drawing itself, and decode time is the network's business rather
 * than ours. ADR-0032.
 */
export function revealDuration(style: LaunchStyle, count: number): number {
  // Terminal's domain line lands one step after the last layer row, so it ends the card.
  if (style === "terminal") return rowDelay(count) + REVEAL.row.duration;
  const lastTile = tileDelay(Math.max(count - 1, 0)) + REVEAL.tile.duration;
  // The legend and the domain land after the last tile, so they, not it, end the sequence.
  return Math.max(lastTile, legendDelay(count) + REVEAL.row.duration);
}
