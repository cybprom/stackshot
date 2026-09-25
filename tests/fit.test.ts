import { describe, expect, it } from "vitest";
import satori from "satori";
import { FAILURE_REASONS } from "@/lib/failure";
import { Card } from "@/lib/render/card";
import { ErrorCard } from "@/lib/render/error-card";
import { FONTS } from "@/lib/render/fonts";
import { STACK_MAP } from "@/lib/stack-map";
import type { Category, StackDoc } from "@/lib/stack-map/types";
import { CARD, ERROR_CARD_HEIGHT, type Theme } from "@/lib/tokens";
import { DOC_FIXTURES, fixtureDoc } from "@/tests/helpers/fixture-docs";

const CATEGORIES: Category[] = ["frontend", "backend", "infra", "tooling"];

/**
 * The spike's WORST_CASE_DOC, rebuilt from the map rather than hand-written: every layer
 * full, every item the longest display name its category actually has, every version
 * present, overflow everywhere, and the longest repo name GitHub allows. ADR-0011 named
 * this the fit test's natural fixture, so it outlives the file it came from.
 */
function worstCaseDoc(): StackDoc {
  return {
    owner: "a-fairly-long-organisation-name",
    repo: "awesome-machine-learning-operations-and-data-engineering-resources-2026",
    language: "TypeScript",
    stars: 999_999,
    layers: CATEGORIES.map((category) => ({
      category,
      items: STACK_MAP.filter((e) => e.category === category)
        .sort((a, b) => b.display.length - a.display.length)
        .slice(0, 6)
        .map((e) => ({ id: e.id, display: e.display, version: "10.20", description: e.description })),
      overflow: 99,
    })),
    unmapped: [],
  };
}

/**
 * The check inherited from the spike's scripts/assert-fits.tsx, which ADR-0011's teardown
 * retired. It is not a spike concern: satori does not clip or warn on vertical overflow,
 * it draws outside the canvas, and yoga's default flexShrink of 0 means a too-tall card
 * silently loses its footer rather than failing.
 *
 * The spike scraped the SVG for the lowest drawn y. That measure is saturated by the
 * card's own frame rect — every card scored 797/800 whatever was inside it — so this uses
 * satori's own layout pass instead, which reports absolute geometry per node. Verified to
 * detect a real overflow: the densest fixture on a 600-unit canvas reports 659.
 */
async function deepestBottom(element: ReturnType<typeof Card>, height: number): Promise<number> {
  let deepest = 0;
  await satori(element, {
    width: CARD.width,
    height,
    fonts: FONTS,
    onNodeDetected: (node) => {
      deepest = Math.max(deepest, node.top + node.height);
    },
  });
  return deepest;
}

const THEMES = ["light", "dark"] as const;

describe("nothing is laid out past the canvas", () => {
  it.each(DOC_FIXTURES.flatMap((f) => THEMES.map((t) => [f, t] as const)))("%s, %s", async (fixture, theme) => {
    const doc = await fixtureDoc(fixture);
    expect(await deepestBottom(Card({ doc, theme }), CARD.height)).toBeLessThanOrEqual(CARD.height);
  });

  it.each(FAILURE_REASONS.flatMap((r) => THEMES.map((t) => [r, t] as const)))("error %s, %s", async (reason, theme) => {
    const element = ErrorCard({ reason, owner: "octocat", repo: "hello-world", theme });
    expect(await deepestBottom(element, ERROR_CARD_HEIGHT)).toBeLessThanOrEqual(ERROR_CARD_HEIGHT);
  });

  it.each(THEMES)("the worst case the layout has to survive, %s", async (theme) => {
    expect(await deepestBottom(Card({ doc: worstCaseDoc(), theme }), CARD.height)).toBeLessThanOrEqual(CARD.height);
  });

  it("holds for the longest name GitHub allows, on a real card", async () => {
    const base = await fixtureDoc("Grandbusta__spyde");
    for (const repo of ["a".repeat(100), "long-".repeat(20).slice(0, 99)]) {
      for (const theme of THEMES satisfies readonly Theme[]) {
        expect(await deepestBottom(Card({ doc: { ...base, repo }, theme }), CARD.height)).toBeLessThanOrEqual(CARD.height);
      }
    }
  });

  // Without this the suite above could pass on a metric that never moves. GOTCHAS 041.
  it("detects an overflow when there is one", async () => {
    const doc = await fixtureDoc("mastodon__mastodon");
    expect(await deepestBottom(Card({ doc, theme: "light" }), 600)).toBeGreaterThan(600);
  });
});
