import type { Category } from "@/lib/stack-map/types";

export type Theme = "light" | "dark";

/**
 * Bumped whenever rendered output changes on purpose — a token, the card tree, a font, or
 * a satori/resvg upgrade. It is part of the `png:` cache key, so a bump retires every
 * stored PNG at once instead of serving the old design for the rest of its 30-day TTL.
 *
 * `tests/render-hash.test.ts` is the mechanism that makes this happen: it fails when the
 * bytes move, and its message says to bump this and update the committed hashes in the
 * same commit. ADR-0005's amendment has the reasoning.
 */
export const RENDER_VERSION = 1;

export const COLORS: Record<Theme, Record<string, string>> = {
  light: {
    surface: "#EDEEEA",
    ink: "#101615",
    inkMuted: "#5A625E",
    // Decorative hairlines only — fails 3:1 against surface. See DESIGN.md COLOR.
    rule: "#C8CCC4",
    accent: "#C8461E",
  },
  dark: {
    surface: "#0E1113",
    ink: "#DDE2DD",
    inkMuted: "#8B9490",
    rule: "#242A2B",
    accent: "#FF6B3D",
  },
};

/**
 * One colour and one tint per layer, per theme. Shared by every style, so a card is
 * recognisably Stackshot whichever one it is drawn in.
 *
 * These reverse DESIGN's self-critique #2, which chose rule-weight encoding over colour
 * precisely to avoid this, and they take the palette past "one accent, nothing else".
 * Both reversals are argued in ADR-0029 rather than assumed here. `accent` is untouched
 * and still means one thing.
 */
export const LAYER_COLORS: Record<Theme, Record<Category, { color: string; tint: string }>> = {
  light: {
    frontend: { color: "#2458C4", tint: "#E4ECFA" },
    backend: { color: "#1B7F52", tint: "#E0F1E7" },
    infra: { color: "#9A5F0E", tint: "#F5EAD6" },
    tooling: { color: "#596068", tint: "#EAECED" },
  },
  dark: {
    frontend: { color: "#7FAEFF", tint: "#14223A" },
    backend: { color: "#5CC896", tint: "#10291D" },
    infra: { color: "#E5AE58", tint: "#2A2111" },
    tooling: { color: "#A8AEB5", tint: "#1C2126" },
  },
};

export const SPACE = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const CARD = {
  width: 1200,
  // 800, not 750 — the rule-weight floor pushed the vertical budget over. GOTCHAS 012.
  height: 800,
  padding: 32,
  // Off-scale by necessity: derived from the rotated label's cap height.
  gutter: 72,
  border: 3,
  accentBar: 4,
  headerBand: 140,
  footer: 56,
  bandMinHeight: 120,
  // The error card's one band. Sized by the longest rotated state label rather than by
  // its content — NOTHING MAPPED needs ~196u, well past bandMinHeight. Step 7's
  // gutter-fit test is what holds this.
  errorBand: 240,
  // Measure for running text on a card. Commit Mono advances at 0.609em, so this is
  // ~71 characters of card/version, against DESIGN's cap of 68.
  measure: 960,
  // Decreasing downward, floor of 3. Hierarchy comes from weight, not color.
  separators: [8, 5, 3, 3],
  radius: 2,
} as const;

// Commit Mono ships 400 and 700 only, and the scale is built on that. GOTCHAS 014.
export const TYPE = {
  display: { size: 64, family: "Archivo", weight: 600, lineHeight: 1.0, tracking: -0.02 },
  owner: { size: 24, family: "Commit Mono", weight: 400, lineHeight: 1.2, tracking: 0 },
  item: { size: 30, family: "Commit Mono", weight: 400, lineHeight: 1.1, tracking: -0.01 },
  version: { size: 22, family: "Commit Mono", weight: 400, lineHeight: 1.1, tracking: 0 },
  overflow: { size: 22, family: "Commit Mono", weight: 400, lineHeight: 1.1, tracking: 0.02 },
  gutter: { size: 18, family: "Commit Mono", weight: 700, lineHeight: 1.0, tracking: 0.18 },
  meta: { size: 16, family: "Commit Mono", weight: 400, lineHeight: 1.2, tracking: 0.04 },
} as const;

// Derived, never chosen: the error card is exactly as tall as the one shape it can hold.
// Every term is a part of the card, so changing any of them moves the height with it.
// Width stays 1200, so type sizes and their display ratios are untouched.
export const ERROR_CARD_HEIGHT =
  2 * CARD.border +
  CARD.accentBar +
  2 * CARD.padding +
  CARD.headerBand +
  CARD.separators[0] +
  CARD.errorBand +
  CARD.footer;

// Steps down past ~22, ~30 and ~48 characters. The counts are a proxy for rendered width
// against a proportional face; the real limit is two lines in the header band, which the
// header enforces by measure. GitHub allows 100 characters and 36 is what fits them.
export function displaySize(repo: string): number {
  if (repo.length > 48) return 36;
  if (repo.length > 30) return 40;
  if (repo.length > 22) return 48;
  return TYPE.display.size;
}
