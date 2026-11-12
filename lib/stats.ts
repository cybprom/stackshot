import { createHash, timingSafeEqual } from "node:crypto";
import type { Redis } from "@upstash/redis";
import { z } from "zod";
import { isoWeek, statsKeys } from "@/lib/counters";

const CountsSchema = z.record(z.string(), z.coerce.number()).nullable();

export type Stats = {
  env: string;
  generatedAt: string;
  about: string;
  total: Record<string, number>;
  weeks: { week: string; counts: Record<string, number> }[];
  distinctRepos: number;
  topUnmapped: { id: string; count: number }[];
  /** READMEs GitHub search finds embedding a card, by week. Undercounts by design. */
  embeds: { week: string; readmes: number }[];
  /** Cards generated on the site, cached or not: the most generated, and the latest. */
  generated: { top: { repo: string; count: number }[]; recent: { repo: string; at: string }[] };
  /** The last 50 fresh failures, newest first. A failure replayed from the cache is not one. */
  failures: Record<string, string>[];
};

const FailuresSchema = z.array(z.record(z.string(), z.string())).catch([]);

const RecentSchema = z.array(z.object({ repo: z.string(), at: z.string() })).catch([]);

/** The last `n` ISO weeks, newest first. */
export function recentWeeks(now: Date, n: number): string[] {
  return Array.from({ length: n }, (_, i) => isoWeek(new Date(now.getTime() - i * 7 * 86_400_000)));
}

/** `zrange … withScores` answers a flat member, score, member, score list. */
export function pairs(flat: unknown[]): { id: string; count: number }[] {
  const out: { id: string; count: number }[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push({ id: String(flat[i]), count: Number(flat[i + 1]) });
  return out;
}

export async function readStats(redis: Redis, env: string, now: Date): Promise<Stats> {
  const keys = statsKeys(env);
  const weeks = recentWeeks(now, 8);
  const [total, repos, unmapped, embeds, top, recent, failures, ...weekly] = await Promise.all([
    redis.hgetall(keys.total),
    redis.pfcount(keys.repos),
    redis.zrange(keys.unmapped, 0, 49, { rev: true, withScores: true }),
    redis.hgetall(keys.embeds),
    redis.zrange(keys.generated, 0, 49, { rev: true, withScores: true }),
    redis.lrange(keys.recent, 0, -1),
    redis.lrange(keys.failures, 0, -1),
    ...weeks.map((week) => redis.hgetall(keys.week(week))),
  ]);
  const embedCounts = CountsSchema.parse(embeds) ?? {};
  return {
    env,
    generatedAt: now.toISOString(),
    about:
      "Cold resolves only: anything served from a cache never reaches these counts. Read the trend, not the number. ADR-0012.",
    total: CountsSchema.parse(total) ?? {},
    weeks: weeks.map((week, i) => ({ week, counts: CountsSchema.parse(weekly[i] ?? null) ?? {} })),
    distinctRepos: Number(repos),
    topUnmapped: pairs(Array.isArray(unmapped) ? unmapped : []),
    embeds: Object.entries(embedCounts)
      .map(([week, readmes]) => ({ week, readmes }))
      .sort((a, b) => b.week.localeCompare(a.week)),
    generated: {
      top: pairs(Array.isArray(top) ? top : []).map(({ id, count }) => ({ repo: id, count })),
      recent: RecentSchema.parse(recent),
    },
    failures: FailuresSchema.parse(failures),
  };
}

const SearchSchema = z.object({ total_count: z.number() });

/** The code search ADR-0012 named: README files that mention the card's domain. */
export function embedQuery(host: string): string {
  return `"${host}" in:file filename:README.md`;
}

export function embedCountFrom(body: unknown): number | undefined {
  const parsed = SearchSchema.safeParse(body);
  return parsed.success ? parsed.data.total_count : undefined;
}

/**
 * The secret as `?key=` so a browser can open the page, or as a bearer token. Both sides
 * are hashed first, so the comparison is constant-time whatever their lengths.
 */
export function authorised(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const given =
    new URL(request.url).searchParams.get("key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(secret));
}
