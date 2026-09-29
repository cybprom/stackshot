import type { Theme } from "@/lib/tokens";

/**
 * The card's visual style, chosen in the URL. Pure and render-free on purpose: the site's
 * client island needs these names, and importing them from the Satori element tree would
 * pull satori into the browser bundle.
 */
export const CARD_STYLES = ["tiles", "terminal", "tags", "sheet"] as const;

export type CardStyle = (typeof CARD_STYLES)[number];

/** What the site offers first, and what the style switcher starts on. */
export const DEFAULT_STYLE: CardStyle = "tiles";

/**
 * What `card-{theme}.png` renders, **permanently**. Not "whatever the default is": the
 * site always writes the explicit style into the snippet it hands out, so this value only
 * governs URLs already embedded in someone's README. Moving it would restyle their card
 * without them touching it, which is the one thing an embedded badge must never do.
 * ADR-0029.
 */
export const LEGACY_STYLE: CardStyle = "tiles";

const FILE = /^([a-z]+)-(light|dark)\.png$/;

function isCardStyle(value: string): value is CardStyle {
  return CARD_STYLES.some((style) => style === value);
}

/** `tiles-dark.png` and the legacy `card-dark.png`, or nothing. */
export function parseCardFile(file: string): { style: CardStyle; theme: Theme } | undefined {
  const match = FILE.exec(file);
  if (!match) return undefined;
  const [, name = "", theme = ""] = match;
  if (theme !== "light" && theme !== "dark") return undefined;
  if (name === "card") return { style: LEGACY_STYLE, theme };
  return isCardStyle(name) ? { style: name, theme } : undefined;
}

export function cardFileName(style: CardStyle, theme: Theme): string {
  return `${style}-${theme}.png`;
}
