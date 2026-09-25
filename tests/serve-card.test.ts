import { beforeEach, describe, expect, it, vi } from "vitest";
import { noopCache, pointerKey, upstashCache, type Cache, type Pointer } from "@/lib/cache";
import { BudgetExceededError, createGitHubClient, type GitHubClient } from "@/lib/github/client";
import { serveCard } from "@/lib/serve-card";
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

const serve = (deps: { cache: Cache; client: GitHubClient | undefined }, owner: string, repo: string, theme: Theme = "light") =>
  serveCard(deps, owner, repo, theme);

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
