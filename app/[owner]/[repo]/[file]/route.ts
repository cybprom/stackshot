import { createCache } from "@/lib/cache";
import { githubToken } from "@/lib/env";
import { createGitHubClient } from "@/lib/github/client";
import { serveCard } from "@/lib/serve-card";
import type { Theme } from "@/lib/tokens";

// @resvg/resvg-js is a native binary. ADR-0004.
export const runtime = "nodejs";

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

  // The two genuine 404s. Neither is a failed card: one is not a card request at all, the
  // other is a site route that happens to look like an owner. Everything past here
  // returns 200 with an image, whatever happens (I5).
  if (!theme) return new Response("Not found", { status: 404 });
  if (RESERVED_OWNERS.has(owner.toLowerCase())) return new Response("Not found", { status: 404 });

  const token = githubToken();
  const { bytes, reason, cacheControl } = await serveCard(
    { cache: createCache(), createClient: token ? () => createGitHubClient({ token }) : undefined },
    owner,
    repo,
    theme,
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
