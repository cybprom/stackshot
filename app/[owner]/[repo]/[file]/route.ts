import { Card } from "@/lib/render/card";
import { renderToPng } from "@/lib/render/render";
import { SPIKE_DOC } from "@/lib/spike-doc";
import type { Theme } from "@/lib/tokens";

// @resvg/resvg-js is a native binary. ADR-0004.
export const runtime = "nodejs";

// Vercel consumes s-maxage and forwards the rest, so without an explicit max-age
// downstream caches get bare `public` and fall back to heuristic freshness. 300 is
// chosen to be unambiguous rather than optimal: no plausible proxy default lands on
// 5 minutes, so step 6 can tell "Camo honoured our header" from "Camo used its own".
// Refetches hit the CDN, not the function, so a short downstream TTL is nearly free.
const CACHE_CONTROL =
  "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";

function themeFor(file: string): Theme | null {
  if (file === "card-light.png") return "light";
  if (file === "card-dark.png") return "dark";
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; file: string }> },
) {
  const { file } = await params;
  const theme = themeFor(file);

  // Never a non-200 for a rendering failure (I5). An unrecognized file name is the
  // one case that is a genuine 404 — it is not a card request at all.
  if (!theme) return new Response("Not found", { status: 404 });

  const png = await renderToPng(Card({ doc: SPIKE_DOC, theme }));

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": CACHE_CONTROL,
    },
  });
}
