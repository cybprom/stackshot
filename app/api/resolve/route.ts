import { z } from "zod";
import { createCache } from "@/lib/cache";
import { githubToken } from "@/lib/env";
import type { FailureReason } from "@/lib/failure";
import { createGitHubClient, SITE_RESOLVE_DEADLINE_MS } from "@/lib/github/client";
import { parseRepoUrl } from "@/lib/github-url";
import { clientIp, createRateLimiter, RESOLVE_LIMIT } from "@/lib/rate-limit";
import { resolveCached } from "@/lib/resolve-cached";

export const runtime = "nodejs";

// Explicit, and comfortably above SITE_RESOLVE_DEADLINE_MS. If the deadline were at or
// above the platform limit, Vercel would kill the function first and the site would get a
// bare 504 instead of the JSON error this route exists to return. The project's default
// is 300s (hobby, fluid compute, iad1) — this is a deliberate ceiling, not the platform's.
export const maxDuration = 30;

// Correct status codes here, unlike the card route: this route's consumer is our own page
// and it has to tell the failures apart. ADR-0007 scoped always-200 to the PNG route only.
const STATUS: Record<FailureReason, number> = {
  not_found: 404,
  no_manifests: 422,
  nothing_mapped: 422,
  rate_limited: 429,
  unavailable: 503,
};

const BodySchema = z.object({ url: z.string().min(1).max(2048) });

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    // Never cached: the site calls this once per paste, and the cacheable artefact is the
    // PNG, not this.
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad_request" }, 400);

  const ref = parseRepoUrl(parsed.data.url);
  if (!ref) return json({ error: "bad_url" }, 400);

  const token = githubToken();
  const limiter = createRateLimiter();
  const ip = clientIp(request);
  let retryAfter = 0;

  const result = await resolveCached(
    {
      cache: createCache(),
      createClient: token
        ? () => createGitHubClient({ token, deadline: AbortSignal.timeout(SITE_RESOLVE_DEADLINE_MS) })
        : undefined,
      // Only a resolve costs GitHub budget, so only a resolve is counted. A cache hit is
      // free and must not consume anyone's quota.
      gate: async () => {
        const verdict = await limiter.spend(ip);
        retryAfter = verdict.retryAfter;
        return verdict.allowed;
      },
    },
    ref.owner,
    ref.repo,
  );

  if (!result.ok) {
    const headers: Record<string, string> = {};
    if (result.reason === "rate_limited" && retryAfter > 0) headers["retry-after"] = String(retryAfter);
    return json({ error: result.reason, limit: RESOLVE_LIMIT }, STATUS[result.reason], headers);
  }

  // `unmapped` is logged, never returned. It is the abuse signal as much as the backlog,
  // and telling a prober exactly what the map is missing is not something the site needs
  // in order to render anything.
  const { unmapped, ...doc } = result.doc;
  void unmapped;
  return json({ doc, cached: result.cached }, 200);
}
