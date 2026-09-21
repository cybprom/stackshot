import { Card } from "@/lib/render/card";
import { CrudeCard } from "@/lib/render/crude-card";
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

type Pin = { kind: "crude"; variant: 1 | 2 } | { kind: "real" };

// Camo caches per URL, but separate URLs do not separate bytes — one handler serves
// all three spike paths. Pinning per path is what stops step 7's deploy from moving
// the bytes step 6 is timing. See ROADMAP "Spike URLs".
function pinFor(owner: string, repo: string): Pin {
  if (owner === "spike" && repo === "theme") return { kind: "crude", variant: 1 };
  // Step 6's single byte change. Flipped 1 -> 2 once, deliberately; any further
  // change to this path voids the TTL measurement. See ROADMAP "Spike URLs".
  if (owner === "spike" && repo === "ttl") return { kind: "crude", variant: 2 };
  return { kind: "real" };
}

function themeFor(file: string): Theme | null {
  if (file === "card-light.png") return "light";
  if (file === "card-dark.png") return "dark";
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; file: string }> },
) {
  const { owner, repo, file } = await params;
  const theme = themeFor(file);

  // Never a non-200 for a rendering failure (I5). An unrecognized file name is the
  // one case that is a genuine 404 — it is not a card request at all.
  if (!theme) return new Response("Not found", { status: 404 });

  const pin = pinFor(owner, repo);

  const png = await renderToPng(
    pin.kind === "crude"
      ? CrudeCard({ theme, variant: pin.variant })
      : Card({ doc: SPIKE_DOC, theme }),
  );

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": CACHE_CONTROL,
    },
  });
}
