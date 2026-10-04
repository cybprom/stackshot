import { describe, expect, it } from "vitest";
import { STACK_MAP } from "@/lib/stack-map";
import { INDEX_CAP, TECH_COUNT, TECH_INDEX, countByCategory, score } from "@/lib/tech-index";

/**
 * The index is the only part of the technology section with any logic in it, and it is a
 * pure function, which is where this project puts its tests. The grid itself is markup.
 */
describe("the index covers the whole map", () => {
  it("has one entry per map entry and loses none", () => {
    expect(TECH_COUNT).toBe(STACK_MAP.length);
    expect(new Set(TECH_INDEX.map((e) => e.id)).size).toBe(STACK_MAP.length);
  });

  it("carries only what a tile and a search need", () => {
    for (const entry of TECH_INDEX) {
      expect(entry.symbol, entry.id).not.toBe("");
      expect(entry.display, entry.id).not.toBe("");
    }
  });

  // The grid is scanned by eye, so it is ordered by the name on the tile rather than by
  // the internal id — which would sort `nextjs` nowhere near `Next.js`.
  it("is alphabetical by what is shown", () => {
    const shown = TECH_INDEX.map((e) => e.display);
    expect(shown).toEqual([...shown].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("counts every entry into exactly one layer", () => {
    const counts = countByCategory();
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(TECH_COUNT);
  });

  // Two rows at desktop width. Enough to show the section is substantial, few enough that
  // "Show all N" is still the interesting number.
  it("shows fewer than it has, so the grid has somewhere to expand to", () => {
    expect(INDEX_CAP).toBeLessThan(TECH_COUNT);
  });
});

describe("searching", () => {
  const find = (q: string) =>
    TECH_INDEX.filter((e) => score(e, q) !== null)
      .sort((a, b) => (score(b, q) ?? 0) - (score(a, q) ?? 0))
      .map((e) => e.display);

  it("shows everything for an empty query", () => {
    expect(TECH_INDEX.filter((e) => score(e, "") !== null)).toHaveLength(TECH_COUNT);
    expect(TECH_INDEX.filter((e) => score(e, "   ") !== null)).toHaveLength(TECH_COUNT);
  });

  it("puts an exact name first", () => {
    expect(find("react")[0]).toBe("React");
    expect(find("redis")[0]).toBe("Redis");
  });

  // The whole reason a prefix outranks a substring: typing "re" should lead with the
  // things called Re-something, not with everything containing those two letters.
  it("ranks a prefix above a substring", () => {
    const entry = { display: "React", search: "react" };
    expect(score(entry, "rea")).toBeGreaterThan(score({ display: "Preact", search: "preact" }, "rea") ?? 0);
  });

  /**
   * The point of indexing aliases: a package name is what someone has in their
   * `package.json`, and it is often not what the technology is called.
   */
  it.each([
    ["nextjs", "Next.js"],
    ["tailwindcss", "Tailwind"],
    ["psycopg", "PostgreSQL"],
  ])("finds %s", (query, display) => {
    expect(find(query)).toContain(display);
  });

  it("is case and whitespace insensitive", () => {
    expect(find("  REACT  ")[0]).toBe("React");
  });

  it("finds nothing for a word in no name", () => {
    expect(find("zzzzzznotathing")).toEqual([]);
  });

  /**
   * Ranking is a sort on this one function, so a fuzzy matcher is a change here and
   * nowhere else — the grid, the chips and the cap all read the number rather than
   * recomputing it. The scores are spread rather than consecutive to leave room between
   * the tiers. ADR-0036.
   */
  it("spreads its tiers, so a better matcher has somewhere to score", () => {
    const exact = score({ display: "Vite", search: "vite" }, "vite");
    const prefix = score({ display: "Vitest", search: "vitest" }, "vite");
    const alias = score({ display: "PostgreSQL", search: "postgresql postgres psycopg" }, "psycopg");
    expect(exact).toBeGreaterThan(prefix ?? 0);
    expect(prefix).toBeGreaterThan(alias ?? 0);
    expect((exact ?? 0) - (prefix ?? 0)).toBeGreaterThanOrEqual(10);
  });

  // The namespace is ours, not something anyone would type.
  it("strips the signal namespace from what it matches", () => {
    const next = TECH_INDEX.find((e) => e.id === "next");
    expect(next?.search).not.toContain("npm:");
    expect(next?.search).toContain("next");
  });
});
