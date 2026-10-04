import { describe, expect, it } from "vitest";
import {
  CARD_STYLES,
  DEFAULT_STYLE,
  LEGACY_STYLE,
  SERVED_STYLES,
  cardFileName,
  isServedStyle,
  parseCardFile,
  type ServedStyle,
} from "@/lib/card-style";
import { cardUrl, pictureSnippet, SITE_ORIGIN } from "@/lib/site";

describe("card URLs and the README snippet", () => {
  it("builds both themes on one origin", () => {
    expect(cardUrl("vercel", "next.js", "tiles", "light")).toBe(`${SITE_ORIGIN}/vercel/next.js/tiles-light.png`);
    expect(cardUrl("vercel", "next.js", "tiles", "dark")).toBe(`${SITE_ORIGIN}/vercel/next.js/tiles-dark.png`);
  });

  /**
   * The pre-warm is worth nothing unless the preview and the snippet are byte-identical
   * URLs: CDN entries are keyed per URL. Both come from this function, so the only way
   * they can diverge is if the page builds one of them from what the user typed.
   */
  it("uses the same URLs the preview loads", () => {
    const snippet = pictureSnippet("vercel", "next.js", "tiles");
    expect(snippet).toContain(cardUrl("vercel", "next.js", "tiles", "light"));
    expect(snippet).toContain(cardUrl("vercel", "next.js", "tiles", "dark"));
  });

  /**
   * The snippet never writes `card-{theme}.png`. That file is pinned to one style
   * forever, so a card already in someone's README cannot be restyled by a change to the
   * site's default — which is the whole reason the style is explicit here. ADR-0029.
   */
  it.each(SERVED_STYLES)("writes the style explicitly: %s", (style: ServedStyle) => {
    const snippet = pictureSnippet("octocat", "hello-world", style);
    expect(snippet).toContain(`${style}-light.png`);
    expect(snippet).toContain(`${style}-dark.png`);
    expect(snippet).not.toContain("card-light.png");
    expect(snippet).not.toContain("card-dark.png");
  });

  it("pins no width or height: one URL serves several heights", () => {
    const snippet = pictureSnippet("octocat", "hello-world", DEFAULT_STYLE);
    expect(snippet).not.toMatch(/\bwidth=/);
    expect(snippet).not.toMatch(/\bheight=/);
  });

  it("puts the dark card behind the dark media query and the light one on the img", () => {
    const snippet = pictureSnippet("octocat", "hello-world", DEFAULT_STYLE);
    expect(snippet).toContain('<source media="(prefers-color-scheme: dark)"');
    expect(snippet).toMatch(/<source[^>]*tiles-dark\.png/);
    expect(snippet).toMatch(/<img[^>]*tiles-light\.png/);
  });

  it("gives the img alt text naming the repo", () => {
    expect(pictureSnippet("vercel", "next.js", DEFAULT_STYLE)).toContain('alt="vercel/next.js tech stack');
  });

  it("serves the page and the cards from one origin, so `download` saves", () => {
    expect(cardUrl("a", "b", DEFAULT_STYLE, "light").startsWith(`${SITE_ORIGIN}/`)).toBe(true);
  });
});

describe("the card file name", () => {
  it.each(SERVED_STYLES)("round-trips %s in both themes", (style: ServedStyle) => {
    expect(parseCardFile(cardFileName(style, "light"))).toEqual({ style, theme: "light" });
    expect(parseCardFile(cardFileName(style, "dark"))).toEqual({ style, theme: "dark" });
  });

  /**
   * ADR-0034. Tags keeps its name in `CARD_STYLES` because the URL grammar and the cache
   * key space are final, but it has no renderer — so the request is refused here rather
   * than answered with a card the URL does not name. The route turns `undefined` into a
   * plain 404, which is "not a card request" and so outside I5, exactly as a bad filename
   * is. Serving Tags means adding it to `SERVED_STYLES` and to `CARD_STYLE_DEFS`.
   */
  it.each(["tags-light.png", "tags-dark.png"])("refuses %s: a style with no renderer", (file) => {
    expect(parseCardFile(file)).toBeUndefined();
  });

  it("refuses every style that has no renderer, not just the one we know about", () => {
    const unserved = CARD_STYLES.filter((style) => !isServedStyle(style));
    expect(unserved).toEqual(["tags"]);
    for (const style of unserved) {
      expect(parseCardFile(cardFileName(style, "light")), style).toBeUndefined();
    }
  });

  /**
   * The promise the whole scheme rests on. Whatever the site's default becomes, these two
   * URLs keep rendering the style they rendered on the day they were embedded.
   */
  it("keeps card-{theme}.png pinned to one style forever", () => {
    expect(parseCardFile("card-light.png")).toEqual({ style: LEGACY_STYLE, theme: "light" });
    expect(parseCardFile("card-dark.png")).toEqual({ style: LEGACY_STYLE, theme: "dark" });
    expect(LEGACY_STYLE).toBe("tiles");
  });

  it.each([
    ["card.png", "no theme"],
    ["tiles.png", "no theme"],
    ["tiles-light.jpg", "wrong extension"],
    ["Tiles-light.png", "styles are lower case"],
    ["tiles-sepia.png", "not a theme"],
    ["nosuchstyle-light.png", "not a style"],
    ["../../etc/passwd", "not a card at all"],
    ["", "empty"],
  ])("refuses %s (%s)", (file) => {
    expect(parseCardFile(file)).toBeUndefined();
  });
});
