import { beforeEach, describe, expect, it, vi } from "vitest";
import { noopCache, pointerKey, type Cache, type Pointer } from "@/lib/cache";
import { parseRepoUrl } from "@/lib/github-url";
import { createGitHubClient, type GitHubClient } from "@/lib/github/client";
import { clientIp, upstashLimiter, RESOLVE_LIMIT, WINDOW_S } from "@/lib/rate-limit";
import { resolveCached } from "@/lib/resolve-cached";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("parsing a pasted URL", () => {
  it.each([
    ["https://github.com/pmndrs/zustand", "pmndrs", "zustand"],
    ["http://github.com/pmndrs/zustand", "pmndrs", "zustand"],
    ["https://www.github.com/pmndrs/zustand", "pmndrs", "zustand"],
    ["github.com/pmndrs/zustand", "pmndrs", "zustand"],
    ["pmndrs/zustand", "pmndrs", "zustand"],
    ["https://github.com/pmndrs/zustand.git", "pmndrs", "zustand"],
    ["https://github.com/pmndrs/zustand/", "pmndrs", "zustand"],
    ["https://github.com/vercel/next.js/tree/canary/packages", "vercel", "next.js"],
    ["https://github.com/vercel/next.js/blob/canary/readme.md", "vercel", "next.js"],
    ["https://github.com/pmndrs/zustand?tab=readme#install", "pmndrs", "zustand"],
    ["  https://github.com/pmndrs/zustand  ", "pmndrs", "zustand"],
    ["https://GitHub.com/pmndrs/zustand", "pmndrs", "zustand"],
  ])("accepts %s", (input, owner, repo) => {
    expect(parseRepoUrl(input)).toEqual({ owner, repo });
  });

  it.each([
    ["https://evil.com/github.com/pmndrs/zustand", "host is evil.com"],
    ["https://github.com.evil.com/a/b", "suffix attack"],
    ["https://github.com@evil.com/a/b", "userinfo, host is evil.com"],
    ["https://notgithub.com/a/b", "different host"],
    ["https://gist.github.com/a/b", "gist is not a repo"],
    ["https://raw.githubusercontent.com/a/b", "not a repo page"],
    ["https://github.com/onlyowner", "no repo segment"],
    ["https://github.com/", "nothing at all"],
    ["", "empty"],
    ["not a url at all", "unparseable"],
    ["https://github.com/þorn/repo", "fails the name gate"],
    ["ftp://github.com/a/b", "not http"],
  ])("rejects %s (%s)", (input) => {
    expect(parseRepoUrl(input)).toBeUndefined();
  });
});

describe("the client IP comes from Vercel, not from the client", () => {
  const req = (headers: Record<string, string>) => new Request("https://x/", { headers });

  it("prefers the header Vercel sets", () => {
    expect(clientIp(req({ "x-vercel-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("ignores x-forwarded-for entirely, which a client can prepend to", () => {
    expect(clientIp(req({ "x-forwarded-for": "9.9.9.9" }))).toBeUndefined();
    // A spoofed x-forwarded-for must not displace the trusted value.
    expect(clientIp(req({ "x-forwarded-for": "9.9.9.9", "x-vercel-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, and takes the first of a list", () => {
    expect(clientIp(req({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(req({ "x-vercel-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });
});

describe("the per-IP limiter", () => {
  function fakeRedis() {
    const counts = new Map<string, number>();
    const ttls = new Map<string, number>();
    return {
      counts,
      ttls,
      incr: async (k: string) => {
        const n = (counts.get(k) ?? 0) + 1;
        counts.set(k, n);
        return n;
      },
      expire: async (k: string, s: number) => {
        ttls.set(k, s);
        return 1;
      },
      ttl: async (k: string) => ttls.get(k) ?? -1,
    };
  }

  it(`allows ${RESOLVE_LIMIT} and refuses the next, with a retry-after`, async () => {
    const redis = fakeRedis();
    const limiter = upstashLimiter(redis as never);
    for (let i = 1; i <= RESOLVE_LIMIT; i++) {
      expect((await limiter.spend("1.2.3.4")).allowed).toBe(true);
    }
    const refused = await limiter.spend("1.2.3.4");
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfter).toBe(WINDOW_S);
  });

  it("sets the window once, so a steady caller is eventually released", async () => {
    const redis = fakeRedis();
    const limiter = upstashLimiter(redis as never);
    await limiter.spend("1.2.3.4");
    redis.ttls.set("rl:resolve:1.2.3.4", 120);
    await limiter.spend("1.2.3.4");
    expect(redis.ttls.get("rl:resolve:1.2.3.4")).toBe(120);
  });

  it("counts each IP separately", async () => {
    const limiter = upstashLimiter(fakeRedis() as never);
    for (let i = 1; i <= RESOLVE_LIMIT; i++) await limiter.spend("1.1.1.1");
    expect((await limiter.spend("1.1.1.1")).allowed).toBe(false);
    expect((await limiter.spend("2.2.2.2")).allowed).toBe(true);
  });

  it("fails open when Upstash is unreachable, and counts a bug", async () => {
    const bug = vi.spyOn(console, "error");
    const limiter = upstashLimiter({ incr: async () => Promise.reject(new Error("down")) } as never);
    expect((await limiter.spend("1.2.3.4")).allowed).toBe(true);
    expect(bug.mock.calls.flat().join(" ")).toContain("rate_limit");
  });

  it("fails open with no IP rather than refusing a real person", async () => {
    const limiter = upstashLimiter(fakeRedis() as never);
    expect((await limiter.spend(undefined)).allowed).toBe(true);
  });
});

describe("the limiter counts resolves, not requests", () => {
  function memoryCache(): Cache {
    const store = new Map<string, unknown>();
    return {
      getPointer: async (o, r) => store.get(pointerKey(o, r)) as Pointer | undefined,
      setPointer: async (o, r, p) => void store.set(pointerKey(o, r), p),
      getDoc: async (h) => store.get(`stack:${h}`) as never,
      setDoc: async (h, d) => void store.set(`stack:${h}`, d),
      getPng: async (h, t) => store.get(`png:${h}:${t}`) as Buffer | undefined,
      setPng: async (h, t, b) => void store.set(`png:${h}:${t}`, b),
    };
  }
  const client = (fixture: string): GitHubClient =>
    createGitHubClient({ token: "fixture", fetch: fixtureFetch(loadResponses(fixture)) });

  it("spends once for a cold resolve and never again for the same repo", async () => {
    const cache = memoryCache();
    let spent = 0;
    const deps = {
      cache,
      createClient: () => client("pmndrs__zustand"),
      gate: async () => {
        spent++;
        return true;
      },
    };
    const first = await resolveCached(deps, "pmndrs", "zustand");
    expect(first.ok).toBe(true);
    expect(spent).toBe(1);

    for (const [o, r] of [["pmndrs", "zustand"], ["PMNDRS", "Zustand"]]) {
      const again = await resolveCached({ ...deps, createClient: undefined }, o, r);
      expect(again.ok).toBe(true);
      if (again.ok) expect(again.cached).toBe(true);
    }
    expect(spent).toBe(1);
  });

  it("turns a refusal into rate_limited without touching GitHub", async () => {
    const forbidden = new Proxy({} as GitHubClient, {
      get() {
        throw new Error("resolved despite being rate limited");
      },
    });
    const result = await resolveCached(
      { cache: noopCache(), createClient: () => forbidden, gate: async () => false },
      "pmndrs",
      "zustand",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rate_limited");
  });

  it("never spends on a name the gate would not have protected anyway", async () => {
    let spent = 0;
    const result = await resolveCached(
      { cache: noopCache(), createClient: undefined, gate: async () => (spent++, true) },
      "þorn",
      "repo",
    );
    expect(result.ok).toBe(false);
    expect(spent).toBe(0);
  });
});
