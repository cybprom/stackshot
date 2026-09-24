import { describe, expect, it } from "vitest";
import { formatVersion, mergeVersions, parseVersion } from "@/lib/version";

describe("parseVersion", () => {
  it.each([
    // npm
    ["^15.1.0", { bound: "concrete", parts: [15, 1, 0] }],
    ["~4.2", { bound: "concrete", parts: [4, 2] }],
    ["15.x", { bound: "concrete", parts: [15] }],
    ["15.0.0-canary.12", { bound: "concrete", parts: [15, 0, 0] }],
    [">=20.9.0", { bound: "floor", parts: [20, 9, 0] }],
    [">=1.2.3 <2", { bound: "floor", parts: [1, 2, 3], upper: { parts: [2], inclusive: false } }],
    ["^18 || ^19", { bound: "concrete", parts: [19] }],
    // Python
    ["==2.31.0", { bound: "concrete", parts: [2, 31, 0] }],
    ["~=3.12", { bound: "concrete", parts: [3, 12] }],
    [">=3.14,<4.0", { bound: "floor", parts: [3, 14], upper: { parts: [4, 0], inclusive: false } }],
    ["<1.0.0,>=0.0.27", { bound: "floor", parts: [0, 0, 27], upper: { parts: [1, 0, 0], inclusive: false } }],
    // Ruby, with the space Gemfiles put after the operator
    ["~> 8.1.0", { bound: "concrete", parts: [8, 1, 0] }],
    [">= 3.3.0", { bound: "floor", parts: [3, 3, 0] }],
    // Go
    ["v1.9.1", { bound: "concrete", parts: [1, 9, 1] }],
    ["1.27", { bound: "concrete", parts: [1, 27] }],
    // Docker tags
    ["24-trixie-slim", { bound: "concrete", parts: [24] }],
    ["4.0.7-slim-trixie", { bound: "concrete", parts: [4, 0, 7] }],
    ["16-alpine3.20", { bound: "concrete", parts: [16] }],
  ])("%s", (raw, expected) => {
    expect(parseVersion(raw)).toEqual(expected);
  });

  it.each(["latest", "*", "next", "alpine", "github:owner/repo#v1.2", "npm:other@^1", "https://x.test/pkg-2.tgz", ""])(
    "%s has no version",
    (raw) => {
      expect(parseVersion(raw)).toBeNull();
    },
  );
});

describe("formatVersion", () => {
  it.each([
    [[15, 1, 0], "major", "15"],
    [[1, 22, 3], "minor", "1.22"],
    [[3], "minor", "3"],
    [[0, 8, 1], "major", "0.8"],
    [[0, 8, 1], "minor", "0.8"],
    [[0, 0, 25], "major", undefined],
    [[0], "major", undefined],
  ] as const)("%j at %s → %s", (parts, precision, expected) => {
    expect(formatVersion([...parts], precision)).toBe(expected);
  });
});

describe("mergeVersions (ADR-0017, ADR-0019)", () => {
  it("prefers what the project runs over what it tolerates", () => {
    expect(mergeVersions([">=20", "24-trixie-slim"], "major")).toBe("24");
  });

  it("takes the higher of two concrete versions", () => {
    expect(mergeVersions(["^18.2.0", "^19.0.0"], "major")).toBe("19");
  });

  it("shows no version when every source is an unbounded floor", () => {
    // ">=12.20.0" is what still runs, not what the project is built on. ADR-0019.
    expect(mergeVersions([">=18", ">=20.9.0"], "major")).toBeUndefined();
    expect(mergeVersions([">=12.20.0", "lts/*"], "major")).toBeUndefined();
    expect(mergeVersions([">2.0"], "major")).toBeUndefined();
  });

  it("renders a bounded range when the bound pins what we display (ADR-0020)", () => {
    expect(mergeVersions([">=3.14,<4.0"], "major")).toBe("3");
    expect(mergeVersions([">=3.3.4,<4.0.0"], "major")).toBe("3");
    expect(mergeVersions(["<=3.9,>=3.7"], "major")).toBe("3");
  });

  it("drops a bounded range that spans the digits it would display", () => {
    // 3.14 through 3.x at minor precision, and 0.141 through 0.999 at 0.x precision.
    expect(mergeVersions([">=3.14,<4.0"], "minor")).toBeUndefined();
    expect(mergeVersions([">=0.141.1,<1.0.0"], "major")).toBeUndefined();
    expect(mergeVersions([">= 3.3.0, < 4.1.0"], "major")).toBeUndefined();
  });

  it("prefers a range that renders over a higher floor that doesn't", () => {
    expect(mergeVersions([">=22", ">=3.14,<4.0"], "major")).toBe("3");
  });

  it("uses a concrete source when one joins the floors", () => {
    expect(mergeVersions([">=20", "20"], "major")).toBe("20");
  });

  it("ignores signals without a usable version", () => {
    expect(mergeVersions([undefined, "latest", "^6.1"], "major")).toBe("6");
    expect(mergeVersions([undefined, "*"], "major")).toBeUndefined();
  });

  it("shows minor for toolchains whose major never moves", () => {
    expect(mergeVersions(["1.27"], "minor")).toBe("1.27");
    expect(mergeVersions(["3.14.1"], "minor")).toBe("3.14");
    expect(mergeVersions(["1.96.0"], "minor")).toBe("1.96");
  });

  it("doesn't let a floor outrank a lower concrete version", () => {
    expect(mergeVersions([">=22", "^20.1"], "major")).toBe("20");
  });
});
