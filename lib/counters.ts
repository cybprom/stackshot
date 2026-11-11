import { Redis } from "@upstash/redis";
import { deployEnv, upstashConfig } from "@/lib/env";
import type { FailureReason } from "@/lib/failure";
import type { LaunchStyle } from "@/lib/preview";

/**
 * The counters ADR-0012 asked for. Each call logs at once and queues an increment; the
 * routes flush the queue with `after()`, so counting never delays a card. Every key and
 * field name comes from code, never from a request, which is what keeps storage bounded.
 */

/** What the page reports on its own: the two things a visitor does after seeing a card. */
export const SITE_EVENTS = ["copy", "download_light", "download_dark"] as const;
export type SiteEvent = (typeof SITE_EVENTS)[number];

// The queue's own causes for a refusal, counted apart from GitHub's own rate limit.
const REFUSALS = new Set(["per_ip", "budget"]);

// The unmapped log is the backlog, not an archive. Past this the rarest ids are dropped.
export const UNMAPPED_KEEP = 1000;
// The same bound for generated repos. A new repo at count 1 can fall straight off a full
// list, which is the price of a fixed size: the ones that matter keep coming back.
export const GENERATED_KEEP = 1000;
export const RECENT_KEEP = 50;
const WEEK_TTL_S = 400 * 24 * 3600;

type Batch = {
  fields: Map<string, number>;
  repos: Set<string>;
  unmapped: Map<string, number>;
  generated: Map<string, number>;
  recent: { repo: string; at: string }[];
};

const emptyBatch = (): Batch => ({
  fields: new Map(),
  repos: new Set(),
  unmapped: new Map(),
  generated: new Map(),
  recent: [],
});
let pending = emptyBatch();

function bump(field: string, by = 1) {
  pending.fields.set(field, (pending.fields.get(field) ?? 0) + by);
}

/** An expected failure, by reason. A product signal: some of these are normal. */
export function countFailure(reason: FailureReason, context: Record<string, unknown> = {}): void {
  console.warn(`stackshot.failure ${reason}`, context);
  const cause = context.cause;
  bump(typeof cause === "string" && REFUSALS.has(cause) ? `refused_${cause}` : `failure_${reason}`);
}

/**
 * A throw. Separate from the failure counts on purpose: a defect hidden inside normal
 * failure noise is a defect nobody looks at. ADR-0012, amended.
 */
export function countBug(kind: string, error: unknown, context: Record<string, unknown> = {}): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`stackshot.bug ${kind}`, detail, context);
  bump("bug");
  bump(`bug_${kind}`);
}

/**
 * A cold resolve, with the API calls it cost and where the time went. Logged only when one
 * happens, so its absence is the evidence that a request was served from cache. I6 caps
 * `calls` at 2. The phase breakdown is what makes a timeout actionable. GOTCHAS 042.
 */
export function countResolve(
  owner: string,
  repo: string,
  calls: number,
  phases: { name: string; ms: number }[] = [],
  outcome = "ok",
): void {
  const breakdown = phases.map((p) => `${p.name}=${p.ms}`).join(" ");
  console.info(`stackshot.resolve ${owner}/${repo} outcome=${outcome} calls=${calls} ${breakdown}`);
  bump("resolve");
  if (outcome === "ok") {
    bump("resolve_ok");
    pending.repos.add(`${owner}/${repo}`.toLowerCase());
  }
}

/**
 * A request served from cache, and what the round trips cost. Logged, not counted: it says
 * how far Upstash is, and ADR-0012 asked for no hit rate.
 */
export function countCacheHit(owner: string, repo: string, phases: { name: string; ms: number }[]): void {
  console.info(`stackshot.cachehit ${owner}/${repo} ${phases.map((p) => `${p.name}=${p.ms}`).join(" ")}`);
}

/** The product backlog and the abuse signal at once. ARCHITECTURE, rate limiting. */
export function countUnmapped(ids: string[]): void {
  if (ids.length === 0) return;
  console.info(`stackshot.unmapped`, ids);
  for (const id of ids) pending.unmapped.set(id, (pending.unmapped.get(id) ?? 0) + 1);
}

/** With the style on screen, so the counts can say whether Tiles is the right default. */
export function countEvent(event: SiteEvent, style?: LaunchStyle): void {
  bump(event);
  if (style) bump(`${event}_${style}`);
}

/**
 * A card generated on the site, cached or not. Only the site counts here: README views
 * never reach us (ADR-0003), and a cold resolve mostly measures when the cache expired.
 * Public repo names only, never who asked.
 */
export function countGenerated(owner: string, repo: string, at: Date = new Date()): void {
  const name = `${owner}/${repo}`;
  pending.generated.set(name, (pending.generated.get(name) ?? 0) + 1);
  pending.recent.push({ repo: name, at: at.toISOString() });
}

/** `2026-W46`. ISO weeks start on Monday, and the week belongs to the year of its Thursday. */
export function isoWeek(date: Date): string {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const statsKeys = (env: string) => ({
  total: `${env}:stats:total`,
  week: (week: string) => `${env}:stats:week:${week}`,
  repos: `${env}:stats:repos`,
  unmapped: `${env}:stats:unmapped`,
  // Week -> README count, written by scripts/embed-count.ts. One field a week.
  embeds: `${env}:stats:embeds`,
  generated: `${env}:stats:generated`,
  recent: `${env}:stats:recent`,
});

export type CounterOp =
  | { op: "hincrby"; key: string; field: string; by: number }
  | { op: "expire"; key: string; seconds: number }
  | { op: "pfadd"; key: string; members: string[] }
  | { op: "zincrby"; key: string; member: string; by: number }
  | { op: "ztrim"; key: string; keep: number }
  | { op: "lpush"; key: string; items: { repo: string; at: string }[] }
  | { op: "ltrim"; key: string; keep: number };

/** The writes one batch turns into. Pure, so what reaches Redis is testable. */
export function counterOps(batch: Batch, now: Date, env: string): CounterOp[] {
  const keys = statsKeys(env);
  const week = keys.week(isoWeek(now));
  const ops: CounterOp[] = [];
  for (const [field, by] of batch.fields) {
    ops.push({ op: "hincrby", key: keys.total, field, by }, { op: "hincrby", key: week, field, by });
  }
  if (batch.fields.size > 0) ops.push({ op: "expire", key: week, seconds: WEEK_TTL_S });
  // A HyperLogLog: a fixed 12KB whatever the number of repos, at about 1% error.
  if (batch.repos.size > 0) ops.push({ op: "pfadd", key: keys.repos, members: [...batch.repos] });
  for (const [member, by] of batch.unmapped) ops.push({ op: "zincrby", key: keys.unmapped, member, by });
  if (batch.unmapped.size > 0) ops.push({ op: "ztrim", key: keys.unmapped, keep: UNMAPPED_KEEP });
  for (const [member, by] of batch.generated) ops.push({ op: "zincrby", key: keys.generated, member, by });
  if (batch.generated.size > 0) ops.push({ op: "ztrim", key: keys.generated, keep: GENERATED_KEEP });
  // Oldest first, because each push lands at the head: the newest ends up first.
  if (batch.recent.length > 0) {
    ops.push({ op: "lpush", key: keys.recent, items: batch.recent }, { op: "ltrim", key: keys.recent, keep: RECENT_KEEP });
  }
  return ops;
}

let redis: Redis | null | undefined;
function counterRedis(): Redis | null {
  if (redis === undefined) {
    const config = upstashConfig();
    redis = config ? new Redis(config) : null;
  }
  return redis;
}

/** Writes everything queued since the last flush. Never throws: a count is not worth a card. */
export async function flushCounters(): Promise<void> {
  const batch = pending;
  pending = emptyBatch();
  const client = counterRedis();
  const ops = counterOps(batch, new Date(), deployEnv());
  if (!client || ops.length === 0) return;
  try {
    const pipe = client.pipeline();
    for (const op of ops) {
      if (op.op === "hincrby") pipe.hincrby(op.key, op.field, op.by);
      else if (op.op === "expire") pipe.expire(op.key, op.seconds);
      else if (op.op === "pfadd") pipe.pfadd(op.key, ...op.members);
      else if (op.op === "zincrby") pipe.zincrby(op.key, op.by, op.member);
      else if (op.op === "ztrim") pipe.zremrangebyrank(op.key, 0, -(op.keep + 1));
      else if (op.op === "lpush") pipe.lpush(op.key, ...op.items);
      else pipe.ltrim(op.key, 0, op.keep - 1);
    }
    await pipe.exec();
  } catch (error) {
    // Logged, not counted: counting a failure to count would recurse.
    console.error("stackshot.counters flush failed", String(error));
  }
}

/** For tests: what is queued, without flushing it. */
export function pendingBatch(): Batch {
  return pending;
}

export function resetCounters(): void {
  pending = emptyBatch();
}
