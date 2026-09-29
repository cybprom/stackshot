import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BLOB_FALLBACK_BUDGET,
  BudgetExceededError,
  createCardClient,
  createGitHubClient,
  createSiteClient,
  errorFromResponse,
  PER_FETCH_MS,
  RESOLVE_DEADLINE_MS,
  SITE_PER_FETCH_MS,
  SITE_RESOLVE_DEADLINE_MS,
  type GitHubError,
} from "@/lib/github/client";
import { resolve } from "@/lib/resolve";
import { hangingFetch, loadResponses, slowFixtureFetch } from "@/tests/helpers/fixture-fetch";

const Any = z.unknown();
const respond = (body: string, status = 200): typeof fetch => async () => new Response(body, { status });
const client = (fetch: typeof globalThis.fetch = respond("{}"), deadline?: AbortSignal) =>
  createGitHubClient({ token: "t", fetch, deadline, perFetchMs: 20 });

describe("budget counter (I6)", () => {
  it("counts GraphQL and REST calls but not raw", async () => {
    const c = client();
    await c.graphql("q", {}, Any);
    await c.raw("o/r/sha/a");
    await c.raw("o/r/sha/b");
    await c.rest("/x", Any);
    expect(c.calls()).toBe(2);
  });

  it("throws on the third authenticated call", async () => {
    const c = client();
    await c.graphql("q", {}, Any);
    await c.rest("/x", Any);
    await expect(c.rest("/y", Any)).rejects.toThrow(BudgetExceededError);
    expect(c.calls()).toBe(2);
  });

  it("allows up to 8 after the blob fallback raises the ceiling", async () => {
    const c = client();
    c.raiseBudgetForBlobFallback();
    for (let i = 0; i < BLOB_FALLBACK_BUDGET; i++) await c.rest(`/b/${i}`, Any);
    await expect(c.rest("/b/9", Any)).rejects.toThrow(BudgetExceededError);
  });

  it("keeps separate counts per client", async () => {
    const a = client();
    const b = client();
    await a.rest("/x", Any);
    await a.rest("/y", Any);
    expect(b.calls()).toBe(0);
  });
});

describe("errorFromResponse", () => {
  const now = 1_000_000;
  const cases: [string, number, Record<string, string>, GitHubError][] = [
    ["bad token", 401, {}, { kind: "unauthorized" }],
    ["missing", 404, {}, { kind: "not_found" }],
    ["primary limit, 403", 403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1790000000" }, { kind: "rate_limited", resetAt: 1_790_000_000_000 }],
    ["primary limit, 429", 429, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1790000000" }, { kind: "rate_limited", resetAt: 1_790_000_000_000 }],
    ["secondary limit, 403", 403, { "retry-after": "30", "x-ratelimit-remaining": "4000" }, { kind: "rate_limited", resetAt: now + 30_000 }],
    ["secondary limit, 429", 429, { "retry-after": "30" }, { kind: "rate_limited", resetAt: now + 30_000 }],
    ["429 with no headers", 429, {}, { kind: "rate_limited", resetAt: now + 60_000 }],
    ["plain 403", 403, { "x-ratelimit-remaining": "4000" }, { kind: "http", status: 403 }],
    ["server error", 502, {}, { kind: "http", status: 502 }],
  ];

  it.each(cases)("%s", (_name, status, headers, expected) => {
    expect(errorFromResponse(new Response(null, { status, headers }), now)).toEqual(expected);
  });
});

describe("typed failures", () => {
  it("maps a schema mismatch to bad_response", async () => {
    const res = await client(respond('{"nope":1}')).rest("/x", z.object({ a: z.string() }));
    expect(res.ok || res.error.kind).toBe("bad_response");
  });

  it("maps a non-JSON body to bad_response", async () => {
    const res = await client(respond("<html>")).rest("/x", Any);
    expect(res.ok || res.error.kind).toBe("bad_response");
  });

  it("maps a rejected fetch to network", async () => {
    const res = await client(async () => Promise.reject(new TypeError("fetch failed"))).rest("/x", Any);
    expect(res.ok || res.error.kind).toBe("network");
  });

  it("times out a request that never answers", async () => {
    const res = await client(hangingFetch).raw("o/r/sha/package.json");
    expect(res).toEqual({ ok: false, error: { kind: "timeout" } });
  });

  it("times out at the resolve deadline without spending budget", async () => {
    const c = client(respond("{}"), AbortSignal.abort());
    expect(await c.graphql("q", {}, Any)).toEqual({ ok: false, error: { kind: "timeout" } });
    expect(c.calls()).toBe(0);
  });
});

/**
 * ADR-0028 option C, both halves. The site route's deadline was widened to 10s while its
 * per-fetch limit stayed at the card route's 2500, so per-fetch bound first and a 2.5s
 * tree call died with six seconds of budget unspent.
 *
 * The two clients are built by the same factories the routes use, because the bug was
 * never in the limits — it was in one route applying half of them.
 */
describe("the two routes' clients have different patience (ADR-0028)", () => {
  const TREE = "/git/trees/";
  // Past the card route's 2500, inside the site's 6250.
  const SLOW_MS = 3000;

  it("a 3s tree fetch resolves for the site and times out for the card route", async () => {
    const responses = loadResponses("pmndrs__zustand");
    const slow = () => slowFixtureFetch(responses, TREE, SLOW_MS);

    // In parallel: two independent clients, so this costs 3s of wall clock, not 5.5.
    const [site, card] = await Promise.all([
      resolve(createSiteClient("t", slow()), "pmndrs", "zustand"),
      resolve(createCardClient("t", slow()), "pmndrs", "zustand"),
    ]);

    expect(site.ok, "the site waited for the tree call").toBe(true);
    expect(card).toEqual({ ok: false, error: { kind: "timeout" } });
  }, 20_000);

  it("derives the site's per-fetch limit rather than picking one", () => {
    // The same fraction of its deadline that 2500 is of 4000.
    expect(SITE_PER_FETCH_MS / SITE_RESOLVE_DEADLINE_MS).toBe(PER_FETCH_MS / RESOLVE_DEADLINE_MS);
    expect(SITE_PER_FETCH_MS).toBe(6250);
  });

  it("keeps per-fetch under the deadline on both routes, or the deadline never binds", () => {
    expect(PER_FETCH_MS).toBeLessThan(RESOLVE_DEADLINE_MS);
    expect(SITE_PER_FETCH_MS).toBeLessThan(SITE_RESOLVE_DEADLINE_MS);
  });
});
