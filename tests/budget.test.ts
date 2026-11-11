import { describe, expect, it } from "vitest";
import { BUDGET_FLOOR, budgetLow, readingFrom } from "@/lib/budget";
import { createGitHubClient } from "@/lib/github/client";
import { fetchRepoHead } from "@/lib/github/repo";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";

const NOW = 1_800_000_000_000;

describe("reading the allowance from a response", () => {
  it("takes remaining, limit and reset", () => {
    const headers = new Headers({
      "x-ratelimit-remaining": "4971",
      "x-ratelimit-limit": "5000",
      "x-ratelimit-reset": "1790087072",
    });
    expect(readingFrom(headers)).toEqual({ remaining: 4971, limit: 5000, resetAt: 1_790_087_072_000 });
  });

  it("assumes a classic PAT's 5000 when the limit is missing", () => {
    const headers = new Headers({ "x-ratelimit-remaining": "12", "x-ratelimit-reset": "1790087072" });
    expect(readingFrom(headers)?.limit).toBe(5000);
  });

  it.each([
    ["no headers at all", {}],
    ["no reset", { "x-ratelimit-remaining": "12" }],
    ["a remaining that is not a number", { "x-ratelimit-remaining": "lots", "x-ratelimit-reset": "1790087072" }],
  ])("ignores %s", (_, raw) => {
    expect(readingFrom(new Headers(raw))).toBeUndefined();
  });
});

describe("whether the budget is low", () => {
  const reading = (remaining: number, resetAt = NOW + 60_000) => ({ remaining, limit: 5000, resetAt });

  it("is low below the floor in either bucket", () => {
    expect(budgetLow({ core: reading(499) }, NOW)).toBe(true);
    expect(budgetLow({ core: reading(4000), graphql: reading(10) }, NOW)).toBe(true);
  });

  it("is not low at the floor exactly", () => {
    expect(budgetLow({ core: reading(5000 * BUDGET_FLOOR) }, NOW)).toBe(false);
  });

  it("ignores a reading from a window that has already reset", () => {
    expect(budgetLow({ core: reading(0, NOW - 1) }, NOW)).toBe(false);
  });

  it("is not low with nothing recorded, so a cold or unreachable store fails open", () => {
    expect(budgetLow({}, NOW)).toBe(false);
  });
});

describe("the client records what each response reports", () => {
  it("files GraphQL under its own bucket", async () => {
    const client = createGitHubClient({ token: "fixture", fetch: fixtureFetch(loadResponses("pmndrs__zustand")) });
    expect(client.budget()).toEqual({});
    const head = await fetchRepoHead(client, "pmndrs", "zustand");
    expect(head.ok).toBe(true);
    expect(client.budget().graphql?.remaining).toBeGreaterThan(0);
    expect(client.budget().core).toBeUndefined();
  });
});
