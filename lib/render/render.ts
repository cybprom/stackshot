import type { ReactNode } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { CARD } from "@/lib/tokens";
import { FONTS } from "@/lib/render/fonts";

/**
 * A number, or `"content"` for Satori to size the canvas to the tree. Spelled rather than
 * left as `undefined`, because a default parameter turns `undefined` back into 800 and
 * every content-height card would silently render clipped. GOTCHAS 050.
 */
export type CardHeight = number | "content";

/**
 * Rasterizes a Satori element tree to PNG bytes. Pure: same input, same bytes (I2), and
 * height is part of that input — the error card is shorter than a real card.
 *
 * Tiles and Terminal are content-height; the fixed-band Datasheet must not be, or a short
 * stack would leave its lower bands hanging in empty space.
 */
export async function renderToPng(element: ReactNode, height: CardHeight = CARD.height): Promise<Buffer> {
  const svg = await satori(element, {
    width: CARD.width,
    ...(height === "content" ? {} : { height }),
    fonts: FONTS,
  });

  // 2x, then let the browser downscale — the card's smallest type is 16 units in a
  // 1200-unit space shown at roughly a quarter scale. See ADR-0004.
  const png = new Resvg(svg, { fitTo: { mode: "zoom", value: 2 } }).render().asPng();
  return Buffer.from(png);
}
