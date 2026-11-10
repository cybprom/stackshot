import { describe, expect, it } from "vitest";
import {
  PANEL_COLUMN,
  PANEL_GAP,
  PANEL_PAD,
  PANEL_WIDTH,
  WALL_COLUMNS,
  WALL_DRIFT,
  WALL_ROWS,
  panelCardWidth,
  wallColumns,
} from "@/lib/hero";
import { WALL_REPOS } from "@/lib/home";

/** Invisible in a screenshot taken at one moment, so asserted here. */
describe("the gallery wall's allocation", () => {
  const columns = wallColumns();
  const slots = columns.flat();

  it("fills every slot", () => {
    expect(columns).toHaveLength(WALL_COLUMNS);
    for (const column of columns) expect(column).toHaveLength(WALL_ROWS);
  });

  it("shows every repo the same number of times", () => {
    const seen = new Map<string, number>();
    for (const slot of slots) seen.set(slot.ref, (seen.get(slot.ref) ?? 0) + 1);

    expect(seen.size).toBe(WALL_REPOS.length);
    for (const repo of WALL_REPOS) expect(seen.get(repo)).toBe(3);
  });

  it("never repeats a repo within one column", () => {
    for (const column of columns) {
      expect(new Set(column.map((slot) => slot.ref)).size).toBe(WALL_ROWS);
    }
  });

  it("never puts one repo side by side in neighbouring columns", () => {
    for (let c = 1; c < columns.length; c++) {
      for (let row = 0; row < WALL_ROWS; row++) {
        expect(columns[c]?.[row]?.ref).not.toBe(columns[c - 1]?.[row]?.ref);
      }
    }
  });

  it("mixes both styles down every column", () => {
    for (const column of columns) expect(new Set(column.map((slot) => slot.style)).size).toBe(2);
  });

  it("gives every column its own drift", () => {
    expect(WALL_DRIFT).toHaveLength(WALL_COLUMNS);
    expect(new Set(WALL_DRIFT.map((drift) => drift.rate)).size).toBe(WALL_COLUMNS);
  });
});

describe("the panel", () => {
  it("opens by shrinking the column it holds", () => {
    expect(PANEL_WIDTH.open).toBeGreaterThan(PANEL_WIDTH.closed);
    expect(PANEL_COLUMN.open).toBeLessThan(PANEL_COLUMN.closed);
  });

  it("gives the closed panel's whole width to the form", () => {
    expect(PANEL_WIDTH.closed - PANEL_COLUMN.closed).toBe(PANEL_PAD * 2);
  });

  /** A column sized from the opening panel measures zero on the frame it mounts. GOTCHAS 060. */
  it("derives the card's column without reference to the opening panel", () => {
    const css = panelCardWidth();
    expect(css).not.toContain("%");
    expect(css).toContain("100vw");
    expect(PANEL_WIDTH.open - PANEL_PAD * 2 - PANEL_COLUMN.open - PANEL_GAP).toBe(644);
  });
});
