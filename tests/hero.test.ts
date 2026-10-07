import { describe, expect, it } from "vitest";
import {
  INTRO_DELAY_MS,
  PANEL_COLUMN,
  PANEL_GAP,
  PANEL_PAD,
  PANEL_WIDTH,
  PANEL_WIDTH_MS,
  panelCardWidth,
  SITE_LAYOUTS,
  WALL_COLUMNS,
  WALL_ROWS,
  isSiteLayout,
  siteLayout,
  wallColumns,
} from "@/lib/hero";
import { WALL_REPOS } from "@/lib/home";
import { PLATE_HEIGHT_MS, REVEAL } from "@/lib/preview";

describe("which layout ships", () => {
  it("falls back to A when nothing asks for one", () => {
    expect(siteLayout(undefined)).toBe("a");
    expect(siteLayout("nonsense")).toBe("a");
  });

  it("takes the query parameter over the configured default", () => {
    expect(siteLayout("c")).toBe("c");
    expect(siteLayout(["c", "a"])).toBe("c");
  });

  it("knows its own two names", () => {
    expect(SITE_LAYOUTS).toEqual(["a", "c"]);
    expect(isSiteLayout("a")).toBe(true);
    expect(isSiteLayout("b")).toBe(false);
  });
});

/**
 * The wall is decoration, but a wall that shows one repo twice in a column or runs the
 * same order in two columns reads as a loop rather than as a gallery — and that is
 * invisible in a screenshot taken at one moment.
 */
describe("the gallery wall's allocation", () => {
  const columns = wallColumns();
  const slots = columns.flat();

  it("divides the repo list evenly into columns", () => {
    // A seventeenth repo would otherwise fall off the wall in silence.
    expect(WALL_REPOS.length % WALL_COLUMNS).toBe(0);
  });

  it("fills every slot", () => {
    expect(columns).toHaveLength(WALL_COLUMNS);
    for (const column of columns) expect(column).toHaveLength(WALL_ROWS);
  });

  it("shows every repo the same number of times", () => {
    const seen = new Map<string, number>();
    for (const slot of slots) seen.set(slot.ref, (seen.get(slot.ref) ?? 0) + 1);

    expect(seen.size).toBe(WALL_REPOS.length);
    for (const repo of WALL_REPOS) expect(seen.get(repo)).toBe(2);
  });

  it("never repeats a repo within one column", () => {
    for (const column of columns) {
      expect(new Set(column.map((slot) => slot.ref)).size).toBe(WALL_ROWS);
    }
  });

  it("never runs the same order in two columns", () => {
    const orders = columns.map((column) => column.map((slot) => slot.ref).join(" "));
    expect(new Set(orders).size).toBe(WALL_COLUMNS);
  });

  it("mixes both styles and both themes down every column", () => {
    for (const column of columns) {
      expect(new Set(column.map((slot) => slot.style)).size).toBe(2);
      expect(new Set(column.map((slot) => slot.theme)).size).toBe(2);
    }
  });

  it("does not let the style and the theme flip together", () => {
    // If they did, the wall would only ever show two of the four combinations.
    const pairs = new Set(slots.map((slot) => `${slot.style}-${slot.theme}`));
    expect(pairs.size).toBe(4);
  });
});

describe("C's timings", () => {
  /**
   * The panel's opening is the beat the intro waits for before drawing. If it ran past
   * the first row of the reveal, the card would begin arriving into a frame that was
   * still moving — the same gate `PLATE_HEIGHT_MS` exists for, one level out.
   */
  it("finishes opening before the card's first row arrives", () => {
    expect(PANEL_WIDTH_MS).toBeLessThan(INTRO_DELAY_MS);
    expect(PLATE_HEIGHT_MS).toBeLessThan(PANEL_WIDTH_MS + REVEAL.row.first);
  });

  it("opens the panel by shrinking the column it holds", () => {
    expect(PANEL_WIDTH.open).toBeGreaterThan(PANEL_WIDTH.closed);
    expect(PANEL_COLUMN.open).toBeLessThan(PANEL_COLUMN.closed);
  });

  /** Closed, the column is exactly the panel less its 40-unit padding: the form fills it. */
  it("gives the closed panel's whole width to the form", () => {
    expect(PANEL_WIDTH.closed - PANEL_COLUMN.closed).toBe(PANEL_PAD * 2);
  });

  /**
   * The card's column is sized from the viewport, never from the panel it sits in. A
   * column sized as "whatever is left" is zero wide on the frame it mounts, which is the
   * frame the plate measures — so the card would draw at scale 1 into a 700px frame and
   * be clipped until a `ResizeObserver` delivery walked it back.
   */
  it("derives the card's column without reference to the opening panel", () => {
    const css = panelCardWidth();
    expect(css).not.toContain("%");
    expect(css).toContain("100vw");
    // At a viewport wider than the open panel it is the panel's own leftover.
    expect(css).toContain(`${PANEL_PAD * 2 + PANEL_COLUMN.open + PANEL_GAP}px`);
    expect(PANEL_WIDTH.open - PANEL_PAD * 2 - PANEL_COLUMN.open - PANEL_GAP).toBe(748);
  });
});
