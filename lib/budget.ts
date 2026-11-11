import { z } from "zod";

/**
 * GitHub's hourly allowance, per bucket, as last seen on a real response. Read from the
 * `x-ratelimit-*` headers and never from `/rate_limit`, which reported zero usage while the
 * headers moved. GOTCHAS 025.
 */
export const BUCKETS = ["core", "graphql"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BucketReadingSchema = z.object({
  remaining: z.number(),
  limit: z.number(),
  resetAt: z.number(),
});
export type BucketReading = z.infer<typeof BucketReadingSchema>;
export type Budget = Partial<Record<Bucket, BucketReading>>;

// A classic PAT's allowance in each bucket, for a response that omits the limit header.
const DEFAULT_LIMIT = 5000;

/** Below this share of either bucket, the card route stops resolving repos it has not seen. */
export const BUDGET_FLOOR = 0.1;

export function readingFrom(headers: Headers): BucketReading | undefined {
  const remaining = Number(headers.get("x-ratelimit-remaining") ?? Number.NaN);
  const reset = Number(headers.get("x-ratelimit-reset") ?? Number.NaN);
  if (!Number.isFinite(remaining) || !(reset > 0)) return undefined;
  const limit = Number(headers.get("x-ratelimit-limit"));
  return { remaining, limit: limit > 0 ? limit : DEFAULT_LIMIT, resetAt: reset * 1000 };
}

/** A reading from a window that has already reset says nothing about this one. */
export function budgetLow(budget: Budget, now: number): boolean {
  return BUCKETS.some((bucket) => {
    const reading = budget[bucket];
    return reading !== undefined && reading.resetAt > now && reading.remaining < reading.limit * BUDGET_FLOOR;
  });
}
