import { createCache } from "@/lib/cache";
import { parseCardFile } from "@/lib/card-style";
import { githubToken } from "@/lib/env";
import { createCardClient } from "@/lib/github/client";
import { serveCard } from "@/lib/serve-card";

// @resvg/resvg-js is a native binary. ADR-0004.
export const runtime = "nodejs";

// A deliberate ceiling well above the 4s resolve deadline plus a ~1s render, rather than
// the project's 300s default. A request that somehow outlives this is killed by the
// platform and Camo sees nothing, so it must never be reachable in normal operation.
export const maxDuration = 30;

// `owner` is a root-level dynamic segment, so it collides with any future site route.
// `spike` is here because ADR-0011's teardown needs it whether or not the throwaway repo
// was ever deleted.
const RESERVED_OWNERS = new Set([
  "api",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "about",
  "docs",
  "spike",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; file: string }> },
) {
  const { owner, repo, file } = await params;
  // `{style}-{theme}.png`, plus the legacy `card-{theme}.png` pinned to one style forever.
  const card = parseCardFile(file);

  // The two genuine 404s. Neither is a failed card: one is not a card request at all, the
  // other is a site route that happens to look like an owner. Everything past here
  // returns 200 with an image, whatever happens (I5).
  if (!card) return new Response("Not found", { status: 404 });
  if (RESERVED_OWNERS.has(owner.toLowerCase())) return new Response("Not found", { status: 404 });

  const token = githubToken();
  const { bytes, reason, cacheControl } = await serveCard(
    { cache: createCache(), createClient: token ? () => createCardClient(token) : undefined },
    owner,
    repo,
    card.style,
    card.theme,
  );

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": "image/png",
      // Chosen in lib/serve-card, where it is tested: the value depends on whether the
      // failure fixes itself. ADR-0026, ADR-0027.
      "cache-control": cacheControl,
      // ADR-0007 prefers a header over a status code: the status is always 200, so this
      // is how monitoring tells an error card from a real one.
      ...(reason ? { "x-stackshot-error": reason } : {}),
    },
  });
}
