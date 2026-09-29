import { describe, expect, it } from "vitest";
import { cardUrl, pictureSnippet, SITE_ORIGIN } from "@/lib/site";

describe("card URLs and the README snippet", () => {
  it("builds both themes on one origin", () => {
    expect(cardUrl("vercel", "next.js", "light")).toBe(`${SITE_ORIGIN}/vercel/next.js/card-light.png`);
    expect(cardUrl("vercel", "next.js", "dark")).toBe(`${SITE_ORIGIN}/vercel/next.js/card-dark.png`);
  });

  /**
   * The pre-warm is worth nothing unless the preview and the snippet are byte-identical
   * URLs: CDN entries are keyed per URL. Both come from this function, so the only way
   * they can diverge is if the page builds one of them from what the user typed.
   */
  it("uses the same URLs the preview loads", () => {
    const snippet = pictureSnippet("vercel", "next.js");
    expect(snippet).toContain(cardUrl("vercel", "next.js", "light"));
    expect(snippet).toContain(cardUrl("vercel", "next.js", "dark"));
  });

  it("pins no width or height: one URL serves two aspect ratios", () => {
    const snippet = pictureSnippet("octocat", "hello-world");
    expect(snippet).not.toMatch(/\bwidth=/);
    expect(snippet).not.toMatch(/\bheight=/);
  });

  it("puts the dark card behind the dark media query and the light one on the img", () => {
    const snippet = pictureSnippet("octocat", "hello-world");
    expect(snippet).toContain('<source media="(prefers-color-scheme: dark)"');
    expect(snippet).toMatch(/<source[^>]*card-dark\.png/);
    expect(snippet).toMatch(/<img[^>]*card-light\.png/);
  });

  it("gives the img alt text naming the repo", () => {
    expect(pictureSnippet("vercel", "next.js")).toContain('alt="vercel/next.js tech stack');
  });

  it("serves the page and the cards from one origin, so `download` saves", () => {
    expect(cardUrl("a", "b", "light").startsWith(`${SITE_ORIGIN}/`)).toBe(true);
  });
});
