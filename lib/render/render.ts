import type { ReactNode } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { CARD } from "@/lib/tokens";
import { FONTS } from "@/lib/render/fonts";

/** Rasterizes a Satori element tree to PNG bytes. Pure: same input, same bytes (I2). */
export async function renderToPng(element: ReactNode): Promise<Buffer> {
  const svg = await satori(element, {
    width: CARD.width,
    height: CARD.height,
    fonts: FONTS,
  });

  // 2x, then let the browser downscale — the card's smallest type is 16 units in a
  // 1200-unit space shown at roughly a quarter scale. See ADR-0004.
  const png = new Resvg(svg, { fitTo: { mode: "zoom", value: 2 } }).render().asPng();
  return Buffer.from(png);
}
