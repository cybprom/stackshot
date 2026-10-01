import { describe, expect, it } from "vitest";
import satori from "satori";
import { FONTS } from "@/lib/render/fonts";
import { TerminalCard } from "@/lib/render/terminal";
import type { StackDoc } from "@/lib/stack-map/types";
import { CARD, TERMINAL, TYPE, type Theme } from "@/lib/tokens";
import { DOC_FIXTURES, fixtureDoc } from "@/tests/helpers/fixture-docs";

/**
 * Terminal is content-height and wraps, so what can go wrong is vertical: a label column
 * that wraps pushes its whole row down, and a clamp that does not hold lets a 100-
 * character repo name run the card off the page. Both are measured from satori's layout
 * pass rather than from the arithmetic that produced the tokens.
 */
type Node = { text: string; top: number; left: number; width: number; height: number };

const LINE = 42;
// What a wrapped row of items adds: its line box plus the gap above it.
const WRAPPED_LINE = LINE + TERMINAL.itemRowGap;
const GLYPHS = ["├──", "└──"];

async function layout(doc: StackDoc, theme: Theme) {
  const nodes: Node[] = [];
  const svg = await satori(TerminalCard({ doc, theme }), {
    width: CARD.width,
    fonts: FONTS,
    onNodeDetected: (node) =>
      nodes.push({
        text: (node.textContent ?? "").trim(),
        top: node.top,
        left: node.left,
        width: node.width,
        height: node.height,
      }),
  });
  return {
    nodes,
    height: Number(/ height="([\d.]+)"/.exec(svg)?.[1]),
    labels: nodes.filter((n) => n.width === TERMINAL.labelWidth),
    glyphs: nodes.filter((n) => GLYPHS.includes(n.text)),
  };
}

const THEMES = ["light", "dark"] as const;

describe("the layer tree", () => {
  it.each(DOC_FIXTURES.flatMap((f) => THEMES.map((t) => [f, t] as const)))("%s, %s", async (fixture, theme) => {
    const doc = await fixtureDoc(fixture);
    const { labels, glyphs } = await layout(doc, theme);

    expect(labels).toHaveLength(doc.layers.length);
    // One line each. A wrapped label would push its row down and break the tree.
    for (const label of labels) expect(label.height).toBe(LINE);

    expect(glyphs).toHaveLength(doc.layers.length);
    const last = glyphs.reduce((a, b) => (b.top > a.top ? b : a));
    expect(last.text).toBe("└──");
    expect(glyphs.filter((g) => g.text === "└──")).toHaveLength(1);
  });

  it("draws the box glyphs from Commit Mono, at a mono advance", async () => {
    const { glyphs } = await layout(await fixtureDoc("vercel__next.js"), "light");
    // Three characters at Commit Mono's 0.609em advance, 30 units, as satori rounds it.
    // A missing glyph falls back to another face and stops advancing like a monospace,
    // which is the failure this catches.
    for (const glyph of glyphs) expect(glyph.width).toBe(Math.floor(3 * 0.609 * TYPE.tree.size));
  });

  it("costs exactly one line per wrapped row of items", async () => {
    const base = await fixtureDoc("github__gitignore");
    const [layer] = base.layers;
    if (!layer) throw new Error("fixture has no layers");
    const item = layer.items[0];
    if (!item) throw new Error("fixture has no items");

    const wide = { ...base, layers: [{ ...layer, items: Array.from({ length: 12 }, (_, i) => ({ ...item, id: `i${i}` })) }] };
    const one = await layout(base, "light");
    const many = await layout(wide, "light");

    const extra = many.height - one.height;
    expect(extra % WRAPPED_LINE).toBe(0);
    expect(extra / WRAPPED_LINE).toBeGreaterThan(0);
  });
});

describe("a repo name longer than the card", () => {
  it("clamps the prompt to one line and the title to two", async () => {
    const base = await fixtureDoc("Grandbusta__spyde");
    const doc = { ...base, repo: "a".repeat(100) };
    const { nodes, height } = await layout(doc, "light");

    const prompt = nodes.find((n) => n.text.startsWith("stackshot "));
    const title = nodes.find((n) => n.text.startsWith(`${doc.owner}/a`));
    expect(prompt?.height).toBeCloseTo(TYPE.prompt.size * TYPE.prompt.lineHeight, 0);
    expect(title?.height).toBeLessThanOrEqual(2 * TYPE.terminalName.size * TYPE.terminalName.lineHeight);

    // The clamps are the only reason this is bounded: unclamped, 100 characters at 36
    // units is nearly two cards wide and wraps to five lines.
    expect(height).toBeLessThan((await layout(base, "light")).height + 3 * WRAPPED_LINE);
  });
});
