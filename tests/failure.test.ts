import { describe, expect, it } from "vitest";
import type { ResolveError } from "@/lib/resolve";
import { FAILURE_REASONS, failureReason } from "@/lib/failure";

const CASES: [ResolveError, string][] = [
  [{ kind: "not_found" }, "not_found"],
  [{ kind: "no_manifests" }, "no_manifests"],
  [{ kind: "nothing_mapped", unmapped: ["npm:left-pad"] }, "nothing_mapped"],
  [{ kind: "rate_limited", resetAt: 1_800_000_000_000 }, "rate_limited"],
  [{ kind: "unauthorized" }, "unavailable"],
  [{ kind: "http", status: 502 }, "unavailable"],
  [{ kind: "network", message: "ECONNRESET" }, "unavailable"],
  [{ kind: "timeout" }, "unavailable"],
  [{ kind: "bad_response", message: "expected object" }, "unavailable"],
];

describe("every resolve failure maps to a reason", () => {
  it.each(CASES)("%j", (error, reason) => {
    expect(failureReason(error)).toBe(reason);
  });

  it("covers every kind the resolver can return", () => {
    const kinds = new Set(CASES.map(([error]) => error.kind));
    // Mirrors ResolveError's own union. A new kind fails the Record in lib/failure.ts at
    // compile time and fails this at run time, so neither can be the only guard.
    expect([...kinds].sort()).toEqual(
      ["bad_response", "http", "network", "no_manifests", "not_found", "nothing_mapped", "rate_limited", "timeout", "unauthorized"],
    );
  });

  it("produces no reason the error card has no copy for", () => {
    expect(new Set(CASES.map(([, reason]) => reason))).toEqual(new Set(FAILURE_REASONS));
  });
});
