import { Redis } from "@upstash/redis";
import { countBug } from "@/lib/counters";
import { isProduction, upstashConfig } from "@/lib/env";

// ARCHITECTURE: 20/hour per IP on the JSON route. The site is the only legitimate caller.
export const RESOLVE_LIMIT = 20;
export const WINDOW_S = 3600;

export type RateLimitVerdict = { allowed: boolean; remaining: number; retryAfter: number };

const ALLOWED: RateLimitVerdict = { allowed: true, remaining: RESOLVE_LIMIT, retryAfter: 0 };

export type RateLimiter = {
  /** Called only when a request is about to cost GitHub budget. */
  spend(ip: string | undefined): Promise<RateLimitVerdict>;
};

/**
 * Vercel sets these itself and strips any client-supplied copy. `x-forwarded-for` is
 * deliberately not consulted: it is a list a client can prepend to, so trusting its first
 * element would let anyone mint a fresh quota per request.
 */
export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || undefined;
}

export function noopLimiter(): RateLimiter {
  return { spend: async () => ALLOWED };
}

export function createRateLimiter(): RateLimiter {
  const config = upstashConfig();
  return config ? upstashLimiter(new Redis(config)) : noopLimiter();
}

export function upstashLimiter(redis: Redis): RateLimiter {
  return {
    async spend(ip) {
      if (!ip) {
        // Never on Vercel, where the header is always set. Fail open rather than refuse a
        // real person, and count it, because an unattributable request is a defect.
        if (isProduction()) countBug("rate_limit_no_ip", new Error("no client IP"));
        return ALLOWED;
      }
      try {
        const key = `rl:resolve:${ip}`;
        const count = await redis.incr(key);
        // Set on first use only, so the window is fixed from the first spend rather than
        // sliding forward on every one — otherwise a steady caller is never released.
        if (count === 1) await redis.expire(key, WINDOW_S);
        if (count <= RESOLVE_LIMIT) {
          return { allowed: true, remaining: RESOLVE_LIMIT - count, retryAfter: 0 };
        }
        const ttl = await redis.ttl(key);
        return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : WINDOW_S };
      } catch (error) {
        // Same rule as the cache: a limiter that cannot be reached must not take the route
        // down. Failing open spends budget; failing closed refuses everyone.
        countBug("rate_limit", error, { ip });
        return ALLOWED;
      }
    },
  };
}
