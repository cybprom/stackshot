import type { Theme } from "@/lib/tokens";

/**
 * The card's visual style, chosen in the URL. Pure and render-free on purpose: the site's
 * client island needs these names, and importing them from the Satori element tree would
 * pull satori into the browser bundle.
 */
export const CARD_STYLES = ["tiles", "terminal", "tags", "sheet"] as const;

export type CardStyle = (typeof CARD_STYLES)[number];

/**
 * The styles that have a renderer of their own, and so the only ones a URL can ask for.
 * Tags is named in `CARD_STYLES` because the URL grammar and the cache key space were
 * settled in ADR-0029 and are final; it has no renderer, so `tags-dark.png` is **not a
 * card request** and 404s. ADR-0034.
 *
 * This is the list, not `CARD_STYLES`, that `lib/render/styles.ts` must cover — which is
 * what stops a style being served someone else's pixels while its URL says otherwise.
 */
export const SERVED_STYLES = ["tiles", "terminal", "sheet"] as const satisfies readonly CardStyle[];

export type ServedStyle = (typeof SERVED_STYLES)[number];

export function isServedStyle(value: string): value is ServedStyle {
  return SERVED_STYLES.some((style) => style === value);
}

/** What the site offers first, and what the style switcher starts on. */
export const DEFAULT_STYLE: ServedStyle = "tiles";

/**
 * What `card-{theme}.png` renders, **permanently**. Not "whatever the default is": the
 * site always writes the explicit style into the snippet it hands out, so this value only
 * governs URLs already embedded in someone's README. Moving it would restyle their card
 * without them touching it, which is the one thing an embedded badge must never do.
 * ADR-0029.
 */
export const LEGACY_STYLE: ServedStyle = "tiles";

const FILE = /^([a-z]+)-(light|dark)\.png$/;

/**
 * `tiles-dark.png` and the legacy `card-dark.png`, or nothing.
 *
 * A style with no renderer is nothing here, exactly as an unknown name is. That is the
 * whole of the Tags 404: the route already answers `undefined` with a plain 404, so this
 * never reaches the card path and I5 — a card request is always 200 with an image — is
 * not in play. ADR-0034.
 */
export function parseCardFile(file: string): { style: ServedStyle; theme: Theme } | undefined {
  const match = FILE.exec(file);
  if (!match) return undefined;
  const [, name = "", theme = ""] = match;
  if (theme !== "light" && theme !== "dark") return undefined;
  if (name === "card") return { style: LEGACY_STYLE, theme };
  return isServedStyle(name) ? { style: name, theme } : undefined;
}

export function cardFileName(style: CardStyle, theme: Theme): string {
  return `${style}-${theme}.png`;
}
