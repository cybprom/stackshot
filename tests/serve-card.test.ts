import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NEGATIVE_TTL_S,
  POINTER_TTL_S,
  TRANSIENT_TTL_S,
  noopCache,
  pointerKey,
  pointerTtlSeconds,
  upstashCache,
  type Cache,
  type Pointer,
} from "@/lib/cache";
import { BudgetExceededError, createGitHubClient, type GitHubClient } from "@/lib/github/client";
import {
  CACHE_ERROR_DETERMINISTIC,
  CACHE_ERROR_TRANSIENT,
  CACHE_OK,
  serveCard,
} from "@/lib/serve-card";
import { FAILURE_REASONS, isTransient } from "@/lib/failure";
import type { Theme } from "@/lib/tokens";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

// A cache that counts, so "one repo, one resolve" is assertable rather than assumed.
function memoryCache(): Cache & { calls: string[] } {
  const store = new Map<string, unknown>();
  const calls: string[] = [];
  return {
    calls,
    async getPointer(owner, repo) {
      calls.push(`getPointer ${pointerKey(owner, repo)}`);
      return store.get(pointerKey(owner, repo)) as Pointer | undefined;
    },
    async setPointer(owner, repo, pointer) {
      calls.push(`setPointer ${pointerKey(owner, repo)}`);
      store.set(pointerKey(owner, repo), pointer);
    },
    async getDoc(hash) {
      return store.get(`stack:${hash}`) as never;
    },
    async setDoc(hash, doc) {
      store.set(`stack:${hash}`, doc);
    },
    async getPng(hash, theme) {
      return store.get(`png:${hash}:${theme}`) as Buffer | undefined;
    },
    async setPng(hash, theme, bytes) {
      store.set(`png:${hash}:${theme}`, bytes);
    },
  };
}

function fixtureClient(fixture: string): GitHubClient {
  return createGitHubClient({ token: "fixture", fetch: fixtureFetch(loadResponses(fixture)) });
}

const serve = (
  deps: { cache: Cache; client: GitHubClient | undefined },
  owner: string,
  repo: string,
  theme: Theme = "light",
) => serveCard({ cache: deps.cache, createClient: deps.client ? () => deps.client as GitHubClient : undefined }, owner, repo, theme);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("a repo that resolves", () => {
  it("renders a card, caches the doc, the pointer and the png", async () => {
    const cache = memoryCache();
    const first = await serve({ cache, client: fixtureClient("Grandbusta__spyde") }, "Grandbusta", "spyde");
    expect(first.reason).toBeUndefined();
    expect(first.bytes.subarray(0, 4)).toEqual(PNG_MAGIC);

    // Second request: no client at all, so anything but a full cache hit fails.
    const second = await serve({ cache, client: undefined }, "Grandbusta", "spyde");
    expect(second.reason).toBeUndefined();
    expect(second.bytes.equals(first.bytes)).toBe(true);
  });

  it("serves every spelling of a name from one pointer (GOTCHAS 040)", async () => {
    const cache = memoryCache();
    await serve({ cache, client: fixtureClient("vercel__next.js") }, "vercel", "next.js");

    // A client that throws if touched: a second resolve would fail this outright.
    const forbidden = new Proxy({} as GitHubClient, {
      get() {
        throw new Error("second resolve for the same repo");
      },
    });
    for (const [owner, repo] of [["Vercel", "Next.js"], ["VERCEL", "NEXT.JS"], ["vErCeL", "nExT.Js"]]) {
      const result = await serve({ cache, client: forbidden }, owner, repo);
      expect(result.reason).toBeUndefined();
    }
    expect(new Set(cache.calls.filter((c) => c.startsWith("getPointer")))).toEqual(
      new Set(["getPointer repo:vercel/next.js"]),
    );
  });

  it("keeps the canonical spelling in the pointer, not the request's", async () => {
    const cache = memoryCache();
    await serve({ cache, client: fixtureClient("vercel__next.js") }, "VERCEL", "NEXT.JS");
    const pointer = await cache.getPointer("vercel", "next.js");
    expect(pointer).toMatchObject({ kind: "ok", owner: "vercel", repo: "next.js" });
  });

  it("renders the two themes from one resolve", async () => {
    const cache = memoryCache();
    const light = await serve({ cache, client: fixtureClient("laravel__laravel") }, "laravel", "laravel", "light");
    const dark = await serve({ cache, client: undefined }, "laravel", "laravel", "dark");
    expect(dark.reason).toBeUndefined();
    expect(dark.bytes.equals(light.bytes)).toBe(false);
  });
});

describe("every failure returns an image, never a throw (I5)", () => {
  const cases: [string, string, string][] = [
    ["an illegal name", "þorn", "repo"],
    ["a name over the length limit", "octocat", "a".repeat(101)],
    ["a dot repo", "octocat", "."],
  ];

  it.each(cases)("%s", async (_label, owner, repo) => {
    const result = await serve({ cache: noopCache(), client: undefined }, owner, repo);
    expect(result.reason).toBe("not_found");
    expect(result.bytes.subarray(0, 4)).toEqual(PNG_MAGIC);
  });

  it("maps a missing token to unavailable without touching the cache", async () => {
    const result = await serve({ cache: noopCache(), client: undefined }, "octocat", "hello-world");
    expect(result.reason).toBe("unavailable");
    expect(result.bytes.subarray(0, 4)).toEqual(PNG_MAGIC);
  });

  it("catches a thrown BudgetExceededError and counts it as a bug, not a failure", async () => {
    const bug = vi.spyOn(console, "error");
    const client = new Proxy({} as GitHubClient, {
      get() {
        throw new BudgetExceededError(2);
      },
    });
    const result = await serve({ cache: noopCache(), client }, "octocat", "hello-world");
    expect(result.reason).toBe("unavailable");
    expect(result.bytes.subarray(0, 4)).toEqual(PNG_MAGIC);
    expect(bug.mock.calls.flat().join(" ")).toContain("BudgetExceededError");
  });

  it("survives a cache that throws on every call", async () => {
    const broken: Cache = {
      getPointer: async () => {
        throw new Error("upstash down");
      },
      setPointer: async () => {},
      getDoc: async () => undefined,
      setDoc: async () => {},
      getPng: async () => undefined,
      setPng: async () => {},
    };
    const result = await serve({ cache: broken, client: fixtureClient("Grandbusta__spyde") }, "Grandbusta", "spyde");
    expect(result.reason).toBe("unavailable");
    expect(result.bytes.subarray(0, 4)).toEqual(PNG_MAGIC);
  });

  it("serves a cached failure without resolving again", async () => {
    const cache = memoryCache();
    await cache.setPointer("octocat", "gone", { kind: "failed", reason: "not_found" });
    const forbidden = new Proxy({} as GitHubClient, {
      get() {
        throw new Error("resolved a negatively cached repo");
      },
    });
    const result = await serve({ cache, client: forbidden }, "OctoCat", "Gone");
    expect(result.reason).toBe("not_found");
  });
});

describe("the upstash wrapper", () => {
  it("degrades a read failure to a miss", async () => {
    const redis = { get: async () => Promise.reject(new Error("nope")), set: async () => "OK" };
    const cache = upstashCache(redis as never);
    expect(await cache.getPointer("octocat", "hello-world")).toBeUndefined();
  });

  it("degrades a value of the wrong shape to a miss", async () => {
    const redis = { get: async () => ({ kind: "ok", owner: 42 }), set: async () => "OK" };
    const cache = upstashCache(redis as never);
    expect(await cache.getPointer("octocat", "hello-world")).toBeUndefined();
  });

  it("round-trips png bytes through base64", async () => {
    const store = new Map<string, unknown>();
    const redis = {
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: unknown) => {
        store.set(k, v);
        return "OK";
      },
    };
    const cache = upstashCache(redis as never);
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
    await cache.setPng("abc", "light", bytes);
    expect((await cache.getPng("abc", "light"))?.equals(bytes)).toBe(true);
  });
});

describe("a failure is cached for as long as it stays true (ADR-0027)", () => {
  it("holds a deterministic failure for ten minutes", () => {
    for (const reason of FAILURE_REASONS.filter((r) => !isTransient(r))) {
      expect(pointerTtlSeconds({ kind: "failed", reason })).toBe(NEGATIVE_TTL_S);
    }
    expect(NEGATIVE_TTL_S).toBe(600);
  });

  it("holds a transient failure for one minute", () => {
    for (const reason of FAILURE_REASONS.filter(isTransient)) {
      expect(pointerTtlSeconds({ kind: "failed", reason })).toBe(TRANSIENT_TTL_S);
    }
    expect(TRANSIENT_TTL_S).toBe(60);
  });

  it("holds a success for an hour", () => {
    expect(pointerTtlSeconds({ kind: "ok", owner: "o", repo: "r", sha: "s", stackHash: "h" })).toBe(POINTER_TTL_S);
  });

  it("classifies every reason, and the two groups are disjoint and complete", () => {
    expect(FAILURE_REASONS.filter(isTransient)).toEqual(["rate_limited", "unavailable"]);
    expect(FAILURE_REASONS.filter((r) => !isTransient(r))).toEqual([
      "not_found",
      "no_manifests",
      "nothing_mapped",
    ]);
  });

  it("gives a deterministic failure a ten-minute edge TTL", async () => {
    const result = await serve({ cache: noopCache(), client: undefined }, "þorn", "repo");
    expect(result.reason).toBe("not_found");
    expect(result.cacheControl).toBe(CACHE_ERROR_DETERMINISTIC);
    expect(result.cacheControl).toContain("s-maxage=600");
  });

  it("gives a transient failure a one-minute edge TTL, or the CDN outlives the pointer", async () => {
    // No token is the cheapest way to reach `unavailable` without a network.
    const result = await serve({ cache: noopCache(), client: undefined }, "octocat", "hello-world");
    expect(result.reason).toBe("unavailable");
    expect(result.cacheControl).toBe(CACHE_ERROR_TRANSIENT);
    expect(result.cacheControl).toContain("s-maxage=60");
  });

  it("caches a timeout only briefly, end to end", async () => {
    const cache = memoryCache();
    const timingOut = new Proxy({} as GitHubClient, {
      get: (_t, prop) =>
        prop === "calls" ? () => 1 : async () => ({ ok: false, error: { kind: "timeout" } }),
    });
    const result = await serve({ cache, client: timingOut }, "slow", "repo");
    expect(result.reason).toBe("unavailable");
    const pointer = await cache.getPointer("slow", "repo");
    expect(pointer).toEqual({ kind: "failed", reason: "unavailable" });
    expect(pointerTtlSeconds(pointer!)).toBe(TRANSIENT_TTL_S);
  });

  it("still gives a success the full day at the edge", async () => {
    const result = await serve({ cache: memoryCache(), client: fixtureClient("Grandbusta__spyde") }, "Grandbusta", "spyde");
    expect(result.reason).toBeUndefined();
    expect(result.cacheControl).toBe(CACHE_OK);
  });
});
