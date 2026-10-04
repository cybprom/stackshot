import { z } from "zod";
import DATA from "@/lib/home-data.json";
import { StackDocSchema } from "@/lib/stack-doc";
import type { StackDoc } from "@/lib/stack-map/types";

/**
 * The homepage's data, resolved by `scripts/prepare-home.ts` and committed. **The homepage
 * makes no GitHub call on any path** — not on a cold cache, not after an eviction, not
 * during an outage — which is what ADR-0035 buys and why this is a file rather than a warm
 * cache. The intro card's PNG is rendered from it at build time; the wall is HTML from it.
 */

/** The intro card, and what C generates ~0.9s after load. */
export const INTRO_REPO = "cybprom/stackshot";

/** C's second way in. The first two are also on the wall; the third is the intro card. */
export const TRY_REPOS = ["vercel/next.js", "pmndrs/zustand", INTRO_REPO] as const;

/**
 * The drifting wall behind C's panel: four columns, the sixteen duplicated across them.
 * It sits at 50% opacity and moves, so nobody reads the same card twice — sixteen is the
 * number that gives the wall its variety without doubling a review that has to be done by
 * eye, and the quota behind it.
 *
 * Chosen for three things at once. **Recognisable from the name alone**, because a
 * mini-card shows the name, the stars and six symbols and nothing else. **Spread across
 * ecosystems**, because the wall's whole argument is that this is not an npm tool.
 * **Varied in shape**, so the columns do not read as one card repeated.
 *
 * **Applications, not libraries.** Stackshot reads dependencies, and a repo does not
 * depend on itself, so a library's own card never names the library: `facebook/react`
 * renders `frontend: Zod`, `tailwindlabs/tailwindcss` has no frontend layer at all, and
 * `django/django` is three cells and one of them is Biome. All three were on this list and
 * all three were cut for applications that resolve to a stack worth looking at. Check any
 * addition against `scripts/prepare-home.ts`'s summary before trusting it.
 *
 * Six are recorded fixtures already, so those cards are known good. ADR-0035.
 */
export const WALL_REPOS = [
  // JS/TS
  "vercel/next.js",
  "pmndrs/zustand",
  "excalidraw/excalidraw",
  "immich-app/immich",
  INTRO_REPO,
  // Python
  "apache/airflow",
  "fastapi/fastapi",
  "pandas-dev/pandas",
  // Go
  "pocketbase/pocketbase",
  "grafana/grafana",
  "gohugoio/hugo",
  // Rust
  "astral-sh/uv",
  "denoland/deno",
  // Ruby and PHP
  "mastodon/mastodon",
  "laravel/laravel",
  // Infra
  "supabase/supabase",
] as const;

/** Every repo the file must hold a doc for. The intro and Try repos are on the wall. */
export const HOME_REPOS: readonly string[] = [
  ...new Set<string>([INTRO_REPO, ...TRY_REPOS, ...WALL_REPOS]),
];

export const HomeDataSchema = z.object({
  generatedAt: z.string(),
  /** `cybprom/stackshot`'s stars, the floor under D5's hourly server-side refresh. */
  stars: z.number(),
  docs: z.record(z.string(), StackDocSchema),
});

export type HomeData = z.infer<typeof HomeDataSchema>;

export type HomeCheck =
  | { ok: true; data: HomeData; ageDays: number }
  | { ok: false; problems: string[] };

/**
 * Validates the committed file against the schema and the repo list.
 *
 * Both failures are programmer error caught at build time, never at request time:
 * `scripts/check-home.ts` runs before `next build` the way `check-env.ts` does. Age is
 * **not** a failure — a slightly old stack on a demonstration card is not worth refusing a
 * deploy over — so it is returned for the caller to report. ADR-0035.
 */
export function checkHomeData(raw: unknown = DATA, now = new Date()): HomeCheck {
  const parsed = HomeDataSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, problems: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  }

  // A name added to the list without re-running the script would otherwise be a hole in
  // the wall, or an intro card that renders nothing.
  const missing = HOME_REPOS.filter((ref) => !parsed.data.docs[ref]);
  if (missing.length > 0) {
    return { ok: false, problems: missing.map((ref) => `no doc for ${ref}`) };
  }

  return { ok: true, data: parsed.data, ageDays: ageInDays(parsed.data.generatedAt, now) };
}

export function ageInDays(generatedAt: string, now = new Date()): number {
  const ms = now.getTime() - new Date(generatedAt).getTime();
  return Math.floor(ms / 86_400_000);
}

/** Past this the build says so loudly. The intro card is the first thing anyone sees. */
export const STALE_AFTER_DAYS = 30;

/**
 * The committed doc for one repo. Throws rather than returning a result, because every
 * caller runs after `check-home.ts` has already refused the build for a missing one —
 * this is the programmer-error case the house rule allows a throw for.
 */
export function homeDoc(ref: string): StackDoc {
  const doc = HomeDataSchema.parse(DATA).docs[ref];
  if (!doc) throw new Error(`no committed doc for ${ref}. Run: pnpm tsx scripts/prepare-home.ts`);
  return doc;
}
