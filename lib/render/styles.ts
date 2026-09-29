import type { ReactNode } from "react";
import type { CardStyle } from "@/lib/card-style";
import { Card } from "@/lib/render/card";
import type { StackDoc } from "@/lib/stack-map/types";
import { CARD, type Theme } from "@/lib/tokens";

export type StyleProps = { doc: StackDoc; theme: Theme };

/**
 * A style is an element tree plus the height Satori should lay it out at. `undefined`
 * means content-height — Satori sizes the canvas to the tree, which is what Tiles and
 * Terminal need and what the fixed-band Datasheet must not have.
 */
export type CardStyleDef = {
  element: (props: StyleProps) => ReactNode;
  height: number | undefined;
};

/**
 * Exhaustive by construction: adding a name to `CARD_STYLES` is a type error here until
 * it has a renderer, which is the only thing stopping a URL from resolving to nothing.
 *
 * Tiles, Terminal and Tags draw the Datasheet tree until ROADMAP's Phase 2 and 3 replace
 * them. The URL surface and the cache key are final now; the pixels catch up. **Each
 * replacement bumps RENDER_VERSION**, or the PNGs cached under a style's key while it was
 * a stand-in would be served as the real thing.
 */
export const CARD_STYLE_DEFS: Record<CardStyle, CardStyleDef> = {
  tiles: { element: Card, height: CARD.height },
  terminal: { element: Card, height: CARD.height },
  tags: { element: Card, height: CARD.height },
  sheet: { element: Card, height: CARD.height },
};

export function styleDef(style: CardStyle): CardStyleDef {
  return CARD_STYLE_DEFS[style];
}
