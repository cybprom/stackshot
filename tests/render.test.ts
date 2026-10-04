import { describe, expect, it } from "vitest";
import type { StackDoc } from "@/lib/stack-map/types";
import { SERVED_STYLES, type ServedStyle } from "@/lib/card-style";
import { renderToPng } from "@/lib/render/render";
import { styleDef } from "@/lib/render/styles";
import { DOC_FIXTURES, fixtureDoc } from "@/tests/helpers/fixture-docs";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
// A blank 2400x1600 PNG compresses to a few KB; a drawn card is far larger.
const MIN_DRAWN_BYTES = 20_000;
const THEMES = ["light", "dark"] as const;
// Every style with a tree of its own, which since ADR-0034 is every style a URL can
// ask for: Tags has no renderer and 404s rather than borrowing one.
const STYLES = SERVED_STYLES;

const render = (doc: StackDoc, theme: "light" | "dark", style: ServedStyle = "sheet") => {
  const { element, height } = styleDef(style);
  return renderToPng(element({ doc, theme }), height);
};

describe("every style renders every fixture repo", () => {
  const cases = STYLES.flatMap((s) => DOC_FIXTURES.flatMap((f) => THEMES.map((t) => [s, f, t] as const)));
  it.each(cases)("%s %s, %s", async (style, fixture, theme) => {
    const png = await render(await fixtureDoc(fixture), theme, style);
    expect(png.subarray(0, 4)).toEqual(PNG_MAGIC);
    expect(png.byteLength).toBeGreaterThan(MIN_DRAWN_BYTES);
  });
});

describe("shapes real docs produce that the spike never had", () => {
  it("renders a one-layer card (github/gitignore has only CI signals)", async () => {
    const doc = await fixtureDoc("github__gitignore");
    expect(doc.layers).toHaveLength(1);
    expect((await render(doc, "light")).byteLength).toBeGreaterThan(MIN_DRAWN_BYTES);
  });

  it("renders items with no version at all", async () => {
    const doc = await fixtureDoc("pmndrs__zustand");
    const versionless = doc.layers.flatMap((l) => l.items).filter((i) => i.version === undefined);
    expect(versionless.length).toBeGreaterThan(0);
    expect((await render(doc, "dark")).byteLength).toBeGreaterThan(MIN_DRAWN_BYTES);
  });

  it("renders the densest card, with overflow in every layer it has", async () => {
    const doc = await fixtureDoc("mastodon__mastodon");
    expect(doc.layers.filter((l) => l.overflow > 0).length).toBeGreaterThan(0);
    expect((await render(doc, "light")).byteLength).toBeGreaterThan(MIN_DRAWN_BYTES);
  });

  it.each(STYLES)("%s is byte-identical for the same doc and theme", async (style) => {
    const doc = await fixtureDoc("Grandbusta__spyde");
    const [first, second] = await Promise.all([render(doc, "light", style), render(doc, "light", style)]);
    expect(first.equals(second)).toBe(true);
  });

  it.each(STYLES)("%s differs between themes", async (style) => {
    const doc = await fixtureDoc("Grandbusta__spyde");
    const [light, dark] = await Promise.all([render(doc, "light", style), render(doc, "dark", style)]);
    expect(light.equals(dark)).toBe(false);
  });

  it("draws the same doc differently in every style, so none is a stand-in", async () => {
    const doc = await fixtureDoc("Grandbusta__spyde");
    const drawn = await Promise.all(STYLES.map((style) => render(doc, "light", style)));
    const distinct = new Set(drawn.map((png) => png.toString("base64")));
    expect(distinct.size).toBe(STYLES.length);
  });

});
