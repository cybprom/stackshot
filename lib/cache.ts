import { Redis } from "@upstash/redis";
import { z } from "zod";
import { countBug } from "@/lib/counters";
import { isProduction, upstashConfig } from "@/lib/env";
import { FAILURE_REASONS, isTransient } from "@/lib/failure";
import type { StackDoc } from "@/lib/stack-map/types";
import type { Theme } from "@/lib/tokens";

export const POINTER_TTL_S = 3600;
// A deleted repo's badge would otherwise re-run detection on every cold CDN request.
export const NEGATIVE_TTL_S = 600;
// A timeout or a rate limit is a fact about a moment, not about the repo. Long enough to
// stop a stampede re-running a slow resolve, short enough that recovery is not our
// problem to notice. ADR-0027.
export const TRANSIENT_TTL_S = 60;
export const CONTENT_TTL_S = 30 * 24 * 3600;
// Well inside the 4s resolve deadline: a slow cache must never cost more than the work
// it was there to skip.
export const CACHE_TIMEOUT_MS = 500;

const StackItemSchema = z.object({
  id: z.string(),
  display: z.string(),
  version: z.string().optional(),
  description: z.string(),
});

const StackDocSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  language: z.string().nullable(),
  stars: z.number(),
  layers: z.array(
    z.object({
      category: z.enum(["frontend", "backend", "infra", "tooling"]),
      items: z.array(StackItemSchema),
      overflow: z.number(),
    }),
  ),
  unmapped: z.array(z.string()),
});

// One lookup answers both "have we resolved this?" and "did it fail?", so a 404 repo
// costs the same as a hit.
const PointerSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ok"),
    // The canonical spelling from GraphQL, so a cache hit still renders the right name
    // without an API call. The key is the request lowercased. GOTCHAS 040.
    owner: z.string(),
    repo: z.string(),
    sha: z.string(),
    stackHash: z.string(),
  }),
  z.object({ kind: z.literal("failed"), reason: z.enum(FAILURE_REASONS) }),
]);

export type Pointer = z.infer<typeof PointerSchema>;

/** How long a pointer is allowed to stand. Exported so the split is testable. */
export function pointerTtlSeconds(pointer: Pointer): number {
  if (pointer.kind === "ok") return POINTER_TTL_S;
  return isTransient(pointer.reason) ? TRANSIENT_TTL_S : NEGATIVE_TTL_S;
}

export type Cache = {
  getPointer(owner: string, repo: string): Promise<Pointer | undefined>;
  setPointer(owner: string, repo: string, pointer: Pointer): Promise<void>;
  getDoc(stackHash: string): Promise<StackDoc | undefined>;
  setDoc(stackHash: string, doc: StackDoc): Promise<void>;
  getPng(stackHash: string, theme: Theme): Promise<Buffer | undefined>;
  setPng(stackHash: string, theme: Theme, png: Buffer): Promise<void>;
};

// GitHub names are case-insensitive, so Vercel/Next.js and vercel/next.js are one repo and
// must be one key. The lookup runs before call 1, so it cannot key on the canonical name.
export function pointerKey(owner: string, repo: string): string {
  return `repo:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

/** A cache that stores nothing. Every read misses and every write is dropped. */
export function noopCache(): Cache {
  return {
    getPointer: async () => undefined,
    setPointer: async () => {},
    getDoc: async () => undefined,
    setDoc: async () => {},
    getPng: async () => undefined,
    setPng: async () => {},
  };
}

let warned = false;

/** The real cache when Upstash is configured, a no-op cache when it isn't. */
export function createCache(): Cache {
  const config = upstashConfig();
  if (!config) {
    if (!warned) {
      warned = true;
      // Missing in production is a misconfiguration that shipped, not an expected state:
      // scripts/check-env.ts should have refused the build.
      if (isProduction()) countBug("cache_unconfigured", new Error("Upstash env missing"));
      else console.warn("cache: Upstash not configured, running without a cache");
    }
    return noopCache();
  }
  return upstashCache(new Redis(config));
}

export function upstashCache(redis: Redis): Cache {
  // Every failure is a miss. A cache that can take the route down inverts its purpose,
  // and I5 does not care why the bytes were slow to find.
  async function guard<T>(op: string, run: () => Promise<T>): Promise<T | undefined> {
    try {
      return await Promise.race([
        run(),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), CACHE_TIMEOUT_MS)),
      ]);
    } catch (error) {
      countBug("cache", error, { op });
      return undefined;
    }
  }

  async function read<T>(key: string, schema: z.ZodType<T>): Promise<T | undefined> {
    const raw = await guard(`get ${key}`, () => redis.get<unknown>(key));
    if (raw === undefined || raw === null) return undefined;
    // A value written by an older shape degrades to a miss rather than a crash.
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  }

  return {
    getPointer: (owner, repo) => read(pointerKey(owner, repo), PointerSchema),

    async setPointer(owner, repo, pointer) {
      const ex = pointerTtlSeconds(pointer);
      await guard("setPointer", () => redis.set(pointerKey(owner, repo), pointer, { ex }));
    },

    getDoc: (stackHash) => read(`stack:${stackHash}`, StackDocSchema),

    async setDoc(stackHash, doc) {
      await guard("setDoc", () => redis.set(`stack:${stackHash}`, doc, { ex: CONTENT_TTL_S }));
    },

    async getPng(stackHash, theme) {
      const base64 = await read(`png:${stackHash}:${theme}`, z.string());
      return base64 === undefined ? undefined : Buffer.from(base64, "base64");
    },

    async setPng(stackHash, theme, png) {
      // Upstash stores text, so PNGs ride as base64 and cost ~4/3 their bytes. See
      // ARCHITECTURE's note on storage.
      await guard("setPng", () =>
        redis.set(`png:${stackHash}:${theme}`, png.toString("base64"), { ex: CONTENT_TTL_S }),
      );
    },
  };
}
