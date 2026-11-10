import { describe, expect, it } from "vitest";
import { foundCount } from "@/lib/preview";
import { pictureSnippet, snippetTokens } from "@/lib/site";

describe("the snippet's colouring", () => {
  const snippet = pictureSnippet("pmndrs", "zustand", "tiles");

  it("changes only the whitespace of what it shows", () => {
    const shown = snippetTokens(snippet).map((token) => token.text).join("");
    expect(shown.replace(/\s+/g, " ")).toBe(snippet.replace(/\s+/g, " "));
  });

  it("colours the attributes and their values", () => {
    const kinds = new Set(snippetTokens(snippet).map((token) => token.kind));
    expect(kinds).toEqual(new Set(["tag", "attr", "string", "plain"]));
  });
});

describe("the found count", () => {
  it("includes what the card had no room for", () => {
    const item = { id: "a", display: "A", symbol: "A", description: "" };
    const doc = {
      owner: "o",
      repo: "r",
      language: null,
      stars: 0,
      layers: [
        { category: "frontend" as const, items: [item, item], overflow: 3 },
        { category: "tooling" as const, items: [item], overflow: 0 },
      ],
    };
    expect(foundCount(doc)).toBe(6);
  });
});
