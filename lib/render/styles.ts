import type { ReactNode } from "react";
import type { CardStyle } from "@/lib/card-style";
import { Card } from "@/lib/render/card";
import { TilesCard } from "@/lib/render/tiles";
import type { StackDoc } from "@/lib/stack-map/types";
import { CARD, type Theme } from "@/lib/tokens";
import type { CardHeight } from "@/lib/render/render";

export type StyleProps = { doc: StackDoc; theme: Theme };

/** A style is an element tree plus the height Satori should lay it out at. */
export type CardStyleDef = {
  element: (props: StyleProps) => ReactNode;
  height: CardHeight;
};

/**
 * Exhaustive by construction: adding a name to `CARD_STYLES` is a type error here until
 * it has a renderer, which is the only thing stopping a URL from resolving to nothing.
 *
 * Terminal and Tags still draw the Datasheet tree until ROADMAP's Phase 3 replaces them.
 * The URL surface and the cache key are final now; the pixels catch up. **Each
 * replacement bumps RENDER_VERSION**, or the PNGs cached under a style's key while it was
 * a stand-in would be served as the real thing.
 */
export const CARD_STYLE_DEFS: Record<CardStyle, CardStyleDef> = {
  tiles: { element: TilesCard, height: "content" },
  terminal: { element: Card, height: CARD.height },
  tags: { element: Card, height: CARD.height },
  sheet: { element: Card, height: CARD.height },
};

export function styleDef(style: CardStyle): CardStyleDef {
  return CARD_STYLE_DEFS[style];
}
