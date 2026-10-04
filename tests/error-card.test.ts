import { describe, expect, it } from "vitest";
import { FAILURE_REASONS, type FailureReason } from "@/lib/failure";
import { ROOT_MANIFESTS } from "@/lib/github/tree";
import { ERROR_COPY } from "@/lib/failure";
import { renderErrorCard } from "@/lib/render/error-card";
import { isRepoRef } from "@/lib/repo-ref";
import type { CardStyle } from "@/lib/card-style";
import { CARD, ERROR_CARD_HEIGHT, TYPE, displaySize, lineBox } from "@/lib/tokens";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const MIN_DRAWN_BYTES = 20_000;
const THEMES = ["light", "dark"] as const;
// resvg renders at zoom 2, so a PNG's pixel dimensions are twice the card's units.
const ZOOM = 2;
const STYLES = ["sheet", "tiles", "terminal"] as const satisfies readonly CardStyle[];
const render = (reason: FailureReason, theme: "light" | "dark", repo = "hello-world", style: CardStyle = "sheet") =>
  renderErrorCard({ reason, owner: "octocat", repo, style, theme });

// IHDR is the first chunk: width and height as big-endian u32 at bytes 16 and 20.
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("every failure reason renders a card", () => {
  it.each(FAILURE_REASONS.flatMap((r) => THEMES.map((t) => [r, t] as const)))("%s, %s", async (reason, theme) => {
    const png = await render(reason, theme);
    expect(png.subarray(0, 4)).toEqual(PNG_MAGIC);
    expect(png.byteLength).toBeGreaterThan(MIN_DRAWN_BYTES);
  });

  it("is byte-identical for the same reason and theme (I2)", async () => {
    const [first, second] = await Promise.all([render("not_found", "light"), render("not_found", "light")]);
    expect(first.equals(second)).toBe(true);
  });

  it("differs between themes", async () => {
    const [light, dark] = await Promise.all([render("rate_limited", "light"), render("rate_limited", "dark")]);
    expect(light.equals(dark)).toBe(false);
  });

  it("renders the longest name GitHub allows, broken and unbroken", async () => {
    const unbroken = "a".repeat(100);
    const hyphenated = "long-".repeat(20).slice(0, 99);
    for (const repo of [unbroken, hyphenated]) {
      expect(isRepoRef("octocat", repo)).toBe(true);
      expect((await render("not_found", "light", repo)).byteLength).toBeGreaterThan(MIN_DRAWN_BYTES);
    }
  });
});

/**
 * Every style frames its own error card (ADR-0033), so these run across all three. The
 * failure this guards is the one that is invisible until a stranger embeds a broken repo:
 * Tiles is the default and `card-*.png` is pinned to it.
 */
describe("the error card wears the requested style's frame", () => {
  it.each(STYLES.flatMap((s) => THEMES.map((t) => [s, t] as const)))("%s, %s draws", async (style, theme) => {
    const png = await render("no_manifests", theme, "hello-world", style);
    expect(png.subarray(0, 4)).toEqual(PNG_MAGIC);
    expect(png.byteLength).toBeGreaterThan(MIN_DRAWN_BYTES);
  });

  // The whole point: a failing Tiles embed must not be a Datasheet. The frames differ in
  // their border, radius, surface and accent bar, so the bytes cannot match.
  it("draws a different card per style for the same failure", async () => {
    const [sheet, tiles, terminal] = await Promise.all(
      STYLES.map((style) => render("no_manifests", "light", "hello-world", style)),
    );
    expect(sheet.equals(tiles)).toBe(false);
    expect(tiles.equals(terminal)).toBe(false);
    expect(sheet.equals(terminal)).toBe(false);
  });

  // Tags has no renderer of its own, so it borrows the Datasheet's — including here.
  it("gives tags the Datasheet's error card, as its real card is", async () => {
    const [tags, sheet] = await Promise.all([
      render("not_found", "light", "hello-world", "tags"),
      render("not_found", "light", "hello-world", "sheet"),
    ]);
    expect(tags.equals(sheet)).toBe(true);
  });

  // Content-height, as their real cards are: there is no band system to leave hanging.
  it.each(["tiles", "terminal"] satisfies CardStyle[])("sizes %s to its content", async (style) => {
    const { width, height } = pngSize(await render("no_manifests", "light", "hello-world", style));
    expect(width).toBe(CARD.width * ZOOM);
    expect(height).toBeLessThan(ERROR_CARD_HEIGHT * ZOOM);
    expect(height).toBeGreaterThan(0);
  });
});

describe("the Datasheet's error card is exactly as tall as its content", () => {
  it("is shorter than a real card and the same width", async () => {
    const { width, height } = pngSize(await render("not_found", "light"));
    expect(width).toBe(CARD.width * ZOOM);
    expect(height).toBe(ERROR_CARD_HEIGHT * ZOOM);
    expect(ERROR_CARD_HEIGHT).toBeLessThan(CARD.height);
  });

  it("accounts for every band of chrome, with nothing left over", () => {
    const chrome = 2 * CARD.border + CARD.accentBar + 2 * CARD.padding + CARD.footer;
    const content = CARD.headerBand + CARD.separators[0] + CARD.errorBand;
    expect(chrome + content).toBe(ERROR_CARD_HEIGHT);
  });

});

describe("the copy", () => {
  it("names every root manifest the selector reads", () => {
    for (const manifest of ROOT_MANIFESTS) {
      expect(ERROR_COPY.no_manifests.detail).toContain(manifest);
    }
  });

  it("never states a time, so the render stays pure and the bytes stay cacheable", () => {
    for (const { reason, detail } of Object.values(ERROR_COPY)) {
      expect(`${reason} ${detail}`).not.toMatch(/\d+\s*(second|minute|hour)|\d{4}-\d{2}/);
    }
  });

  it("does not apologize or exclaim", () => {
    for (const { reason, detail } of Object.values(ERROR_COPY)) {
      expect(`${reason} ${detail}`).not.toMatch(/sorry|apolog|oops|!|simply|just |please/i);
    }
  });

  it("keeps the reason line to one line of card/item", () => {
    // Commit Mono advances at 0.609em. The reason sits in the content column, which is
    // the card less its border, padding, gutter and the 24u the content column is inset.
    const column = CARD.width - 2 * CARD.border - 2 * CARD.padding - CARD.gutter - CARD.border - 24;
    for (const { reason } of Object.values(ERROR_COPY)) {
      expect(reason.length * TYPE.item.size * 0.609).toBeLessThan(column);
    }
  });

  it("gives every reason its own gutter label", () => {
    const labels = Object.values(ERROR_COPY).map((c) => c.label);
    expect(new Set(labels).size).toBe(FAILURE_REASONS.length);
    for (const label of labels) expect(label).toBe(label.toUpperCase());
  });
});

describe("the repo-name ladder", () => {
  it("steps down to a size that holds 100 characters in two lines", () => {
    expect(displaySize("a".repeat(100))).toBe(36);
    expect(displaySize("full-stack-fastapi-template")).toBe(48);
    expect(displaySize("next.js")).toBe(TYPE.display.size);
  });

  it("leaves the header band room for the owner line plus two name lines", () => {
    const smallest = displaySize("a".repeat(100));
    const owner = lineBox(TYPE.owner);
    expect(owner + 2 * smallest * TYPE.display.lineHeight).toBeLessThan(CARD.headerBand);
  });
});

describe("the route's name gate", () => {
  it.each([
    ["octocat", "hello-world", true],
    ["a".repeat(39), "a".repeat(100), true],
    ["dots.in.owner", "fine", false],
    ["a".repeat(40), "fine", false],
    ["octocat", "a".repeat(101), false],
    ["octocat", ".", false],
    ["octocat", "..", false],
    ["octocat", "has/slash", false],
    ["þorn", "repo", false],
    ["octocat", "æther", false],
    ["", "repo", false],
  ])("%s/%s -> %s", (owner, repo, valid) => {
    expect(isRepoRef(owner, repo)).toBe(valid);
  });
});
