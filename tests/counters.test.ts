import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countBug,
  countEvent,
  countFailure,
  countGenerated,
  counterOps,
  GENERATED_KEEP,
  RECENT_KEEP,
  countResolve,
  countUnmapped,
  isoWeek,
  pendingBatch,
  resetCounters,
  UNMAPPED_KEEP,
} from "@/lib/counters";
import { authorised, embedCountFrom, embedQuery, pairs, recentWeeks } from "@/lib/stats";

beforeEach(() => {
  resetCounters();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

const fields = () => Object.fromEntries(pendingBatch().fields);

describe("what each counter queues", () => {
  it("counts a resolve as attempted, and as succeeded only when it was", () => {
    countResolve("Pmndrs", "Zustand", 2);
    countResolve("octocat", "gone", 1, [], "not_found");
    expect(fields()).toEqual({ resolve: 2, resolve_ok: 1 });
    expect([...pendingBatch().repos]).toEqual(["pmndrs/zustand"]);
  });

  it("keeps our own refusals apart from GitHub's rate limit", () => {
    countFailure("rate_limited", { cause: "per_ip" });
    countFailure("rate_limited", { cause: "budget" });
    countFailure("rate_limited", { error: "rate_limited" });
    countFailure("unavailable", { cause: "no_token" });
    expect(fields()).toEqual({
      refused_per_ip: 1,
      refused_budget: 1,
      failure_rate_limited: 1,
      failure_unavailable: 1,
    });
  });

  it("counts a bug in total and by kind", () => {
    countBug("cache", new Error("down"));
    expect(fields()).toEqual({ bug: 1, bug_cache: 1 });
  });

  it("counts an event in total and by the style on screen", () => {
    countEvent("copy", "tiles");
    countEvent("copy", "terminal");
    countEvent("download_dark", "tiles");
    expect(fields()).toEqual({ copy: 2, copy_tiles: 1, copy_terminal: 1, download_dark: 1, download_dark_tiles: 1 });
  });

  it("keeps generated repos as a ranked set and the latest as a short list, newest first", () => {
    countGenerated("vercel", "next.js", new Date("2026-11-11T10:00:00Z"));
    countGenerated("vercel", "next.js", new Date("2026-11-11T10:01:00Z"));
    countGenerated("pmndrs", "zustand", new Date("2026-11-11T10:02:00Z"));
    const ops = counterOps(pendingBatch(), new Date("2026-11-11T12:00:00Z"), "production");
    expect(ops).toContainEqual({ op: "zincrby", key: "production:stats:generated", member: "vercel/next.js", by: 2 });
    expect(ops).toContainEqual({ op: "ztrim", key: "production:stats:generated", keep: GENERATED_KEEP });
    const push = ops.find((op) => op.op === "lpush");
    // LPUSH puts each item at the head, so oldest first leaves the newest at the top.
    expect(push && push.op === "lpush" && push.items.map((i) => i.repo)).toEqual([
      "vercel/next.js",
      "vercel/next.js",
      "pmndrs/zustand",
    ]);
    expect(ops).toContainEqual({ op: "ltrim", key: "production:stats:recent", keep: RECENT_KEEP });
  });

  it("counts the page's events and the unmapped ids", () => {
    countEvent("copy");
    countEvent("copy");
    countUnmapped(["npm:left-pad", "npm:left-pad"]);
    expect(fields()).toEqual({ copy: 2 });
    expect(pendingBatch().unmapped.get("npm:left-pad")).toBe(2);
  });
});

describe("the writes a batch becomes", () => {
  it("increments the total and this week, and bounds every key", () => {
    countResolve("pmndrs", "zustand", 2);
    countUnmapped(["npm:x"]);
    const ops = counterOps(pendingBatch(), new Date("2026-11-11T12:00:00Z"), "production");
    expect(ops).toContainEqual({ op: "hincrby", key: "production:stats:total", field: "resolve_ok", by: 1 });
    expect(ops).toContainEqual({
      op: "hincrby",
      key: "production:stats:week:2026-W46",
      field: "resolve_ok",
      by: 1,
    });
    expect(ops).toContainEqual({ op: "expire", key: "production:stats:week:2026-W46", seconds: 400 * 86400 });
    expect(ops).toContainEqual({ op: "pfadd", key: "production:stats:repos", members: ["pmndrs/zustand"] });
    expect(ops).toContainEqual({ op: "ztrim", key: "production:stats:unmapped", keep: UNMAPPED_KEEP });
  });

  it("writes nothing for an empty batch", () => {
    expect(counterOps(pendingBatch(), new Date(), "production")).toEqual([]);
  });
});

describe("ISO weeks", () => {
  it.each([
    ["2026-11-11T00:00:00Z", "2026-W46"],
    ["2026-01-01T00:00:00Z", "2026-W01"],
    // A Friday that belongs to the previous year's last week.
    ["2027-01-01T00:00:00Z", "2026-W53"],
    ["2024-12-30T00:00:00Z", "2025-W01"],
  ])("%s is %s", (date, week) => {
    expect(isoWeek(new Date(date))).toBe(week);
  });

  it("lists recent weeks newest first", () => {
    expect(recentWeeks(new Date("2026-11-11T00:00:00Z"), 3)).toEqual(["2026-W46", "2026-W45", "2026-W44"]);
  });
});

describe("reading the stats", () => {
  it("pairs a flat member and score list", () => {
    expect(pairs(["npm:a", 3, "npm:b", "1"])).toEqual([
      { id: "npm:a", count: 3 },
      { id: "npm:b", count: 1 },
    ]);
  });

  it.each([
    ["the key in the query", "https://x.test/api/stats?key=s3cret", {}, true],
    ["a bearer token", "https://x.test/api/stats", { authorization: "Bearer s3cret" }, true],
    ["a wrong key", "https://x.test/api/stats?key=nope", {}, false],
    ["no key", "https://x.test/api/stats", {}, false],
  ])("authorises %s correctly", (_, url, headers, expected) => {
    expect(authorised(new Request(url, { headers }), "s3cret")).toBe(expected);
  });

  it("searches README files for the card's domain, and reads the total", () => {
    expect(embedQuery("stackshot.ilerioluwa.com")).toBe('"stackshot.ilerioluwa.com" in:file filename:README.md');
    expect(embedCountFrom({ total_count: 12, items: [] })).toBe(12);
    expect(embedCountFrom({ message: "Bad credentials" })).toBeUndefined();
  });

  it("refuses everyone when no secret is configured", () => {
    expect(authorised(new Request("https://x.test/api/stats?key="), undefined)).toBe(false);
  });
});
