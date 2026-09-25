import { describe, expect, it } from "vitest";
import type { StackDoc } from "@/lib/stack-map/types";
import { Card } from "@/lib/render/card";
import { renderToPng } from "@/lib/render/render";
import { DOC_FIXTURES, fixtureDoc } from "@/tests/helpers/fixture-docs";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
// A blank 2400x1600 PNG compresses to a few KB; a drawn card is far larger.
const MIN_DRAWN_BYTES = 20_000;
const THEMES = ["light", "dark"] as const;
const render = (doc: StackDoc, theme: "light" | "dark") => renderToPng(Card({ doc, theme }));

describe("the card renders every fixture repo", () => {
  it.each(DOC_FIXTURES.flatMap((f) => THEMES.map((t) => [f, t] as const)))("%s, %s", async (fixture, theme) => {
    const png = await render(await fixtureDoc(fixture), theme);
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

  it("is byte-identical for the same doc and theme", async () => {
    const doc = await fixtureDoc("Grandbusta__spyde");
    const [first, second] = await Promise.all([render(doc, "light"), render(doc, "light")]);
    expect(first.equals(second)).toBe(true);
  });

  it("differs between themes", async () => {
    const doc = await fixtureDoc("Grandbusta__spyde");
    const [light, dark] = await Promise.all([render(doc, "light"), render(doc, "dark")]);
    expect(light.equals(dark)).toBe(false);
  });

});
