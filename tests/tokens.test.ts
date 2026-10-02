import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COLORS, LAYER_COLORS, PREVIEW, TERMINAL, TILES } from "@/lib/tokens";

/**
 * The site's palette lives in CSS and the card's in TypeScript, because Satori does not
 * run Tailwind. Two copies of the same ten hexes drift silently — the site would go on
 * looking fine while no longer matching the thing it is showing. This is the seam.
 */
const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// Light is the bare `:root`; dark is everything from the media query on. The `@theme
// inline` block that follows only re-exports them as `--color-*`, which these names miss.
const [lightBlock = "", darkBlock = ""] = CSS.split("@media (prefers-color-scheme: dark)");

const value = (block: string, name: string): string | undefined =>
  block.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim().toLowerCase();

const TOKENS = [
  ["surface", "surface"],
  ["ink", "ink"],
  ["ink-muted", "inkMuted"],
  ["rule", "rule"],
  ["accent", "accent"],
] as const;

describe("the site's CSS palette matches the card's tokens", () => {
  it.each(TOKENS)("--color-%s", (cssName, tokenName) => {
    expect(value(lightBlock, cssName)).toBe(COLORS.light[tokenName]?.toLowerCase());
    expect(value(darkBlock, cssName)).toBe(COLORS.dark[tokenName]?.toLowerCase());
  });

  it("defines every palette token in both themes", () => {
    for (const [cssName] of TOKENS) {
      expect(value(lightBlock, cssName), `light --color-${cssName}`).toBeDefined();
      expect(value(darkBlock, cssName), `dark --color-${cssName}`).toBeDefined();
    }
  });

  /**
   * The same seam, for the layer colours every card style shares. The site draws its
   * HTML preview from these and the renderer draws the PNG from `lib/tokens.ts`; the
   * crossfade between them is only a drift detector if both start from the same hexes.
   */
  it.each(["frontend", "backend", "infra", "tooling"] as const)("--layer-%s and its tint", (category) => {
    expect(value(lightBlock, `layer-${category}`)).toBe(LAYER_COLORS.light[category]?.color.toLowerCase());
    expect(value(lightBlock, `layer-${category}-tint`)).toBe(LAYER_COLORS.light[category]?.tint.toLowerCase());
    expect(value(darkBlock, `layer-${category}`)).toBe(LAYER_COLORS.dark[category]?.color.toLowerCase());
    expect(value(darkBlock, `layer-${category}-tint`)).toBe(LAYER_COLORS.dark[category]?.tint.toLowerCase());
  });

  // Tiles' own card surface, for the same reason: the HTML preview draws a tile on it.
  it("--tiles-surface matches the token Tiles paints on", () => {
    expect(value(lightBlock, "tiles-surface")).toBe(TILES.surface.light.toLowerCase());
    expect(value(darkBlock, "tiles-surface")).toBe(TILES.surface.dark.toLowerCase());
  });

  // The one colour that defines Terminal. Without this seam the preview and the PNG drift
  // on exactly the value a reader would notice first.
  it("--terminal-surface matches the token Terminal paints on", () => {
    expect(value(lightBlock, "terminal-surface")).toBe(TERMINAL.surface.light.toLowerCase());
    expect(value(darkBlock, "terminal-surface")).toBe(TERMINAL.surface.dark.toLowerCase());
  });

  /**
   * The plate behind the previewed card. It is CSS and not an inline style because the
   * theme toggle's System has to be answered by a media query rather than by script —
   * which puts a third copy of these two values in play, hence the seam. GOTCHAS 056.
   */
  it("--preview-page matches the surface the card is previewed on", () => {
    expect(value(lightBlock, "preview-page")).toBe(PREVIEW.page.light.toLowerCase());
    expect(value(darkBlock, "preview-page")).toBe(PREVIEW.page.dark.toLowerCase());
  });

  // DESIGN.md COLOR: the card has no semantic colors at all, and these two are site-only.
  it("keeps the semantic colors out of the card's palette", () => {
    for (const name of ["error", "success"]) {
      expect(value(lightBlock, name), `light --color-${name}`).toBeDefined();
      expect(value(darkBlock, name), `dark --color-${name}`).toBeDefined();
      expect(Object.keys(COLORS.light)).not.toContain(name);
    }
  });
});
