import type { ReactNode } from "react";
import type { ServedStyle } from "@/lib/card-style";
import { Card } from "@/lib/render/card";
import { TerminalCard } from "@/lib/render/terminal";
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
 * Exhaustive over `SERVED_STYLES`, and deliberately **not** over `CARD_STYLES`: a style
 * earns a URL by having a renderer, so adding a name here is how Tags starts being served.
 *
 * There are no stand-ins left. Tags drew the Datasheet's tree until ADR-0034, which meant
 * `tags-dark.png` returned a card its URL did not name; it 404s in `parseCardFile` now, so
 * nothing reaches this map that it cannot answer honestly. Shipping Tags is one line here,
 * one in `SERVED_STYLES`, and a `RENDER_VERSION` bump.
 */
export const CARD_STYLE_DEFS: Record<ServedStyle, CardStyleDef> = {
  tiles: { element: TilesCard, height: "content" },
  terminal: { element: TerminalCard, height: "content" },
  sheet: { element: Card, height: CARD.height },
};

export function styleDef(style: ServedStyle): CardStyleDef {
  return CARD_STYLE_DEFS[style];
}
