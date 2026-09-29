import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COLORS } from "@/lib/tokens";

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

  // DESIGN.md COLOR: the card has no semantic colors at all, and these two are site-only.
  it("keeps the semantic colors out of the card's palette", () => {
    for (const name of ["error", "success"]) {
      expect(value(lightBlock, name), `light --color-${name}`).toBeDefined();
      expect(value(darkBlock, name), `dark --color-${name}`).toBeDefined();
      expect(Object.keys(COLORS.light)).not.toContain(name);
    }
  });
});
