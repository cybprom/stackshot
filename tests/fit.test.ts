import { describe, expect, it } from "vitest";
import satori from "satori";
import { FAILURE_REASONS } from "@/lib/failure";
import { Card } from "@/lib/render/card";
import { ERROR_COPY } from "@/lib/failure";
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
        .map((e) => ({ id: e.id, display: e.display, symbol: e.symbol, version: "10.20", description: e.description })),
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

// Datasheet only, and deliberately: it is the style with a fixed canvas to overrun. A
// content-height style's canvas is its content, so the equivalent question there is
// whether the grid fits across and within three rows — `tests/tiles.test.ts`.
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

/**
 * A rotated gutter label is absolutely positioned, so it overlaps its neighbour silently
 * while every overflow check still passes — GOTCHAS 021 named this the thing to assert
 * against and noted that nothing did.
 *
 * Satori reports the label's geometry *before* rotation, so its **width** is the height it
 * needs once rotated. That is the half that moves with the font, the size and the tracking,
 * so it is measured. The band height is fully determined by the tokens, so it is computed.
 * Note the label node's own `height` is its line box, not its band's — using it was the
 * first version of this test and it silently compared the wrong pair.
 */
const GUTTER_LABELS = new Set(["FRONTEND", "BACKEND", "INFRA", "TOOLING"]);

function bandHeight(layers: number): number {
  const chrome = 2 * CARD.border + CARD.accentBar + 2 * CARD.padding + CARD.footer;
  const rules = CARD.separators.slice(0, layers).reduce((a, b) => a + b, 0);
  return (CARD.height - chrome - CARD.headerBand - rules) / layers;
}

async function labelLengths(element: ReturnType<typeof Card>, height: number, wanted: Set<string>) {
  const found: { label: string; needs: number }[] = [];
  await satori(element, {
    width: CARD.width,
    height,
    fonts: FONTS,
    onNodeDetected: (node) => {
      const text = (node.textContent ?? "").trim();
      if (wanted.has(text)) found.push({ label: text, needs: node.width });
    },
  });
  return found;
}

describe("every band clears its rotated gutter label", () => {
  it.each(DOC_FIXTURES)("%s", async (fixture) => {
    const doc = await fixtureDoc(fixture);
    const labels = await labelLengths(Card({ doc, theme: "light" }), CARD.height, GUTTER_LABELS);
    const band = bandHeight(doc.layers.length);
    expect(labels).toHaveLength(doc.layers.length);
    for (const { label, needs } of labels) {
      expect.soft(needs, `${label} needs ${needs}u in a ${band}u band`).toBeLessThanOrEqual(band);
    }
  });

  it.each(FAILURE_REASONS)("error %s", async (reason) => {
    const element = ErrorCard({ reason, owner: "octocat", repo: "hello-world", theme: "light" });
    const wanted = new Set(Object.values(ERROR_COPY).map((c) => c.label));
    const labels = await labelLengths(element, ERROR_CARD_HEIGHT, wanted);
    expect(labels).toHaveLength(1);
    expect(labels[0].needs).toBeLessThanOrEqual(CARD.errorBand);
  });

  it("is tightest on a full four-layer card, and FRONTEND is the binding label", async () => {
    const labels = await labelLengths(Card({ doc: worstCaseDoc(), theme: "light" }), CARD.height, GUTTER_LABELS);
    const worst = labels.reduce((a, b) => (b.needs > a.needs ? b : a));
    expect(worst.label).toBe("FRONTEND");
    // The per-band margin behind GOTCHAS 021's "+71 units of chrome" figure: at four
    // layers the band is 127.75 and FRONTEND measures 110, so 17.75 each, 71 in total.
    expect(bandHeight(4) - worst.needs).toBeCloseTo(17.75, 1);
  });
});
