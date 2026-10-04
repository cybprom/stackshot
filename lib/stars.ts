import DATA from "@/lib/home-data.json";

/**
 * The nav's star count. **Fetched server-side and cached for an hour**, never from the
 * visitor's browser: a per-visitor call would spend a shared quota on a number nobody
 * reads twice, and would leak our token or need an unauthenticated request per page view.
 *
 * `next: { revalidate }` rather than `use cache`, which in Next 16 requires
 * `cacheComponents: true` — an app-wide flag that would change caching semantics for the
 * card route, whose `Cache-Control` is hand-tuned in ADR-0026. Enabling a global mode to
 * fetch one integer is the wrong trade. This is one function to replace if that changes.
 *
 * Unauthenticated on purpose: it is one public number, the 60/hour unauthenticated limit
 * is shared per IP rather than per token, and it keeps the homepage off the budget the
 * card route depends on (I6).
 */
const STARS_TTL_S = 3600;

/** What the page shows if GitHub is slow, down, or rate-limiting. ADR-0035, D5. */
export const COMMITTED_STARS: number = DATA.stars;

export async function stars(repo: string): Promise<number> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { accept: "application/vnd.github+json" },
      next: { revalidate: STARS_TTL_S },
      // The homepage must never wait on GitHub (ADR-0035). The committed number is right
      // there, so a slow call is not worth a single extra second of anyone's time.
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return COMMITTED_STARS;
    const body: unknown = await response.json();
    const count = (body as { stargazers_count?: unknown }).stargazers_count;
    return typeof count === "number" ? count : COMMITTED_STARS;
  } catch {
    return COMMITTED_STARS;
  }
}
