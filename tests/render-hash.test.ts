import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FAILURE_REASONS, type FailureReason } from "@/lib/failure";
import { renderErrorCard } from "@/lib/render/error-card";
import { renderToPng } from "@/lib/render/render";
import { styleDef } from "@/lib/render/styles";
import { RENDER_VERSION, type Theme } from "@/lib/tokens";
import { fixtureDoc } from "@/tests/helpers/fixture-docs";
import HASHES from "@/tests/fixtures/render-hashes.json";

/**
 * I2's other half. `tests/render.test.ts` asserts a rerun inside one process is
 * byte-identical, which proves the render has no hidden state. This asserts the bytes
 * match a **committed** hash, which is the only thing that catches output moving between
 * builds — a font file, a token, a satori or resvg upgrade. Without it, ADR-0005's
 * content-hash key is unsafe: bytes could drift while the StackDoc did not, and cached
 * PNGs and fresh renders would disagree.
 *
 * Verified 2026-09-27 to be platform-independent: the deployed Linux x64 function and a
 * local macOS arm64 render produced byte-identical output for the same doc, so any
 * machine is a valid authority for these hashes. GOTCHAS 043.
 */
const HOW_TO_FIX = [
  "",
  "Rendered output changed.",
  "  If this was NOT deliberate, find what moved — a token, the card tree, a font,",
  "  or a satori/resvg version — before touching this file.",
  "  If the RENDERER moved deliberately: bump RENDER_VERSION in lib/tokens.ts and",
  "  regenerate tests/fixtures/render-hashes.json in the SAME commit. The version is",
  "  part of the png: cache key, so without the bump every stored PNG keeps serving",
  "  the old design for the rest of its 30-day TTL.",
  "  If only the StackDoc moved — detection or the map changed what a fixture",
  "  resolves to — regenerate the hashes and do NOT bump. The key already carries",
  "  stackHash, so a changed doc lands on a new key and nothing stale is served.",
  `  RENDER_VERSION is currently ${RENDER_VERSION}.`,
].join("\n");

const hashes: Record<string, string> = HASHES;
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

const DOCS = ["Grandbusta__spyde", "vercel__next.js", "mastodon__mastodon", "github__gitignore"];
const THEMES = ["light", "dark"] as const;
// Named, not `CARD_STYLES`: Tags is still a stand-in drawing the Datasheet, and
// committing hashes for it would pin bytes to a URL that currently lies.
const STYLES = ["sheet", "tiles", "terminal"] as const;

describe("rendered bytes match their committed hashes (I2)", () => {
  it.each(STYLES.flatMap((s) => DOCS.flatMap((d) => THEMES.map((t) => [s, d, t] as const))))(
    "%s %s, %s",
    async (style, fixture, theme) => {
      const { element, height } = styleDef(style);
      const png = await renderToPng(element({ doc: await fixtureDoc(fixture), theme }), height);
      expect(sha(png), `${style}:${fixture}:${theme}${HOW_TO_FIX}`).toBe(hashes[`${style}:${fixture}:${theme}`]);
    },
  );

  it.each(FAILURE_REASONS)("error %s, light", async (reason: FailureReason) => {
    const png = await renderErrorCard({ reason, owner: "octocat", repo: "hello-world", theme: "light" });
    expect(sha(png), `error:${reason}:light${HOW_TO_FIX}`).toBe(hashes[`error:${reason}:light`]);
  });

  it("error not_found, dark", async () => {
    const png = await renderErrorCard({ reason: "not_found", owner: "octocat", repo: "hello-world", theme: "dark" });
    expect(sha(png), `error:not_found:dark${HOW_TO_FIX}`).toBe(hashes["error:not_found:dark"]);
  });

  it("covers every committed hash, so none can rot unnoticed", () => {
    const covered = [
      ...STYLES.flatMap((s) => DOCS.flatMap((d) => THEMES.map((t: Theme) => `${s}:${d}:${t}`))),
      ...FAILURE_REASONS.map((r) => `error:${r}:light`),
      "error:not_found:dark",
    ];
    expect(new Set(Object.keys(hashes))).toEqual(new Set(covered));
  });
});
