// Puts each style's HTML preview beside its real PNG, at the same width, with a
// difference overlay. The crossfade on the site is the drift detector in production; this
// is the one you can read at a standstill. ADR-0032.
//
// Usage: pnpm tsx scripts/compare-styles.ts [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PREVIEW_CARDS } from "@/app/preview/cards";
import { LAUNCH_STYLES, type LaunchStyle, PREVIEW_WIDTH } from "@/lib/preview";
import { renderToPng } from "@/lib/render/render";
import { styleDef } from "@/lib/render/styles";
import { PREVIEW, type Theme } from "@/lib/tokens";
import { fixtureDoc } from "@/tests/helpers/fixture-docs";

const THEMES = ["light", "dark"] satisfies Theme[];

// Sparsest, the design's own example, and the densest. The 100-character name is the
// shape GOTCHAS 039 broke on and the one place the two clamps could disagree.
const FIXTURES = ["Grandbusta__spyde", "pmndrs__zustand", "vercel__next.js"];
const LONG_NAME = "a".repeat(100);

/** The PNG's own IHDR, so the HTML pane is sized by what the renderer actually produced. */
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

// `src` is a data URI rather than a path: a browser that will not load a file:// image
// beside a file:// page leaves every PNG pane blank, and the sheet is useless exactly
// when it is needed. The .png files are still written, for looking at on their own.
type Row = { label: string; style: LaunchStyle; theme: Theme; src: string; units: number };

async function main(outDir: string) {
  mkdirSync(outDir, { recursive: true });
  const panes: { row: Row; html: string }[] = [];

  for (const style of LAUNCH_STYLES) {
    const { element, height } = styleDef(style);
    const Preview = PREVIEW_CARDS[style];

    for (const label of [...FIXTURES, "name-100"]) {
      const base = await fixtureDoc(label === "name-100" ? "Grandbusta__spyde" : label);
      const doc = label === "name-100" ? { ...base, repo: LONG_NAME } : base;

      for (const theme of THEMES) {
        const png = await renderToPng(element({ doc, theme }), height);
        const { width, height: pixels } = pngSize(png);
        const file = `${style}-${label}-${theme}.png`;
        writeFileSync(join(outDir, file), png);

        // The canvas is 1200 units rendered at 2x, so the card's unit height is pixels/2.
        // The HTML pane is sized by it: if the HTML lays out taller, the pane clips and
        // says so, and if shorter it leaves a gap.
        const units = Math.round((pixels * PREVIEW_WIDTH) / width);
        panes.push({
          row: { label, style, theme, src: `data:image/png;base64,${png.toString("base64")}`, units },
          html: renderToStaticMarkup(createElement(Preview, { doc, theme })),
        });
        console.log(
          `${style.padEnd(9)} ${label.padEnd(20)} ${theme.padEnd(5)} ${String(units).padStart(5)}u ` +
            `${(png.byteLength / 1024).toFixed(0).padStart(4)}KB`,
        );
      }
    }
  }

  writeFileSync(join(outDir, "compare.html"), page(panes), "utf8");

  // One pane per file as well, at a known size, so a headless screenshot of a single
  // difference pane is readable rather than a wall of thumbnails. Behind a flag: each
  // carries its own copy of the faces.
  for (const pane of process.argv.includes("--panes") ? panes : []) {
    const { style, label, theme } = pane.row;
    for (const kind of ["diff", "html"] as const) {
      writeFileSync(join(outDir, `${kind}-${style}-${label}-${theme}.html`), single(pane, kind), "utf8");
    }
  }
  console.log(`\n${join(outDir, "compare.html")}`);
}

function page(panes: { row: Row; html: string }[]): string {
  const cells = panes
    .map(({ row, html }) => {
      const plate = PREVIEW.page[row.theme];
      return `
<section class="row ${row.theme}" style="--uh:${row.units};--png:url(${row.src})">
  <h2>${row.style} · ${row.label} · ${row.theme} · ${row.units}u</h2>
  <div class="cells">
    <figure><figcaption>HTML</figcaption>
      <div class="plate" style="background:${plate}"><div class="pane"><div class="tree">${html}</div></div></div>
    </figure>
    <figure><figcaption>PNG</figcaption>
      <div class="plate" style="background:${plate}"><div class="png"></div></div>
    </figure>
    <figure><figcaption>difference — black is identical</figcaption>
      <div class="plate diff" style="background:${plate}">
        <div class="pane"><div class="tree">${html}</div></div>
        <div class="png over"></div>
      </div>
    </figure>
  </div>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Preview vs PNG</title>
<style>
${FACES}
${LAYOUT}
</style></head>
<body>
<h1>HTML preview vs rendered PNG</h1>
<p>Same width, same fonts, same tokens. The third pane difference-blends the two: black means identical, any glow is drift. A pane that clips or leaves a gap at the bottom means the HTML lays out a different height than the renderer produced.</p>
<div class="widths">
  ${[1100, 600, 390].map((w, i) => `<button aria-pressed="${i === 0}" onclick="document.documentElement.style.setProperty('--w','${w}');document.querySelectorAll('.widths button').forEach(b=>b.setAttribute('aria-pressed',b===this));">${w}px</button>`).join("\n  ")}
</div>
${cells}
</body></html>`;
}

/** One pane, at a known size, for a headless screenshot to be worth reading. */
function single({ row, html }: { row: Row; html: string }, kind: "diff" | "html"): string {
  const plate = PREVIEW.page[row.theme];
  const body =
    kind === "diff"
      ? `<div class="plate diff" style="background:${plate}"><div class="pane"><div class="tree">${html}</div></div><div class="png over"></div></div>`
      : `<div class="plate" style="background:${plate}"><div class="pane"><div class="tree">${html}</div></div></div>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${kind} ${row.style} ${row.label} ${row.theme}</title>
<style>
${FACES}
${LAYOUT}
body{padding:0;background:${plate}}
.plate{--uh:${row.units};--png:url(${row.src})}
</style></head><body>${body}
<script>
// ?w=2400 reads the pair at the PNG's native resolution, where an offset of one unit is
// two pixels rather than a hint difference.
const q = new URLSearchParams(location.search);
if (q.get("w")) document.documentElement.style.setProperty("--w", q.get("w"));
// ?measure=1 reports the HTML's own geometry in card units, for --dump-dom to read. The
// PNG's height is ${row.units}u, so anything but that is layout drift rather than hinting.
if (q.get("measure")) {
  const card = document.querySelector(".tree > *");
  const scale = card.getBoundingClientRect().width / ${PREVIEW_WIDTH};
  const u = (n) => Math.round((n / scale) * 100) / 100;
  const top = card.getBoundingClientRect().top;
  const lines = ["png=${row.units}u", "html=" + u(card.getBoundingClientRect().height) + "u"];
  for (const el of card.children) {
    const r = el.getBoundingClientRect();
    lines.push("  y=" + u(r.top - top) + " h=" + u(r.height) + " " + el.textContent.slice(0, 24));
  }
  const pre = document.createElement("pre");
  pre.id = "measure";
  pre.textContent = lines.join("\\n");
  document.body.append(pre);
}
</script>
</body></html>`;
}

/**
 * The same TTFs the renderer embeds and `next/font` serves, under the variable names
 * `lib/preview.ts` maps to, so this sheet resolves exactly what the site will.
 *
 * Inlined, not linked. A font is a CORS-restricted fetch, and these sit a directory above
 * the page, so a browser can refuse them while loading everything else — and a comparison
 * sheet silently drawn in Helvetica is worse than no sheet at all.
 */
const face = (file: string, family: string, weight: number): string =>
  `@font-face{font-family:${family};font-weight:${weight};src:url(data:font/ttf;base64,${readFileSync(
    join("public", "fonts", file),
  ).toString("base64")})}`;

const FACES = `
${face("Archivo-Regular.ttf", "Archivo", 400)}
${face("Archivo-SemiBold.ttf", "Archivo", 600)}
${face("Archivo-Bold.ttf", "Archivo", 700)}
${face("CommitMono-400-Regular.ttf", '"Commit Mono"', 400)}
${face("CommitMono-700-Regular.ttf", '"Commit Mono"', 700)}
`;

const LAYOUT = `
:root{--font-archivo:Archivo;--font-commit-mono:"Commit Mono";--w:1100;--scale:calc(var(--w)/${PREVIEW_WIDTH})}
/* The site's <html> carries Tailwind's \`antialiased\`, so the sheet must too: without it
   macOS renders live text with subpixel smoothing and stem darkening, which reads a weight
   heavier than the PNG and than the real preview. GOTCHAS 054. */
body{margin:0;padding:24px;background:#EDEEEA;font:14px/1.4 ui-sans-serif,system-ui,sans-serif;color:#101615;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
h1{font-size:18px;margin:0 0 4px}
p{margin:0 0 20px;color:#5A625E}
h2{font-size:13px;font-weight:600;margin:28px 0 8px;font-family:ui-monospace,monospace;color:#5A625E}
.widths{position:sticky;top:0;z-index:2;display:flex;gap:8px;padding:10px 0;background:#EDEEEA}
button{height:32px;padding:0 12px;border:1.5px solid #101615;border-radius:10px;background:#fff;cursor:pointer;font:inherit}
button[aria-pressed=true]{background:#101615;color:#fff}
.cells{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
figcaption{font-family:ui-monospace,monospace;font-size:11px;color:#5A625E;margin-bottom:6px}
.plate{position:relative;width:calc(var(--w)*1px);height:calc(var(--uh)*var(--scale)*1px);overflow:hidden;isolation:isolate}
.pane{position:absolute;inset:0}
/* The one conversion: a 1200-unit tree, scaled by w/1200 from its top-left corner. */
.tree{transform:scale(var(--scale));transform-origin:top left}
.png{width:calc(var(--w)*1px);height:calc(var(--uh)*var(--scale)*1px);background-image:var(--png);background-size:100% 100%}
.diff .over{position:absolute;top:0;left:0;mix-blend-mode:difference}
.dark h2{color:#8B9490}
`;

main(process.argv[2] ?? join("cards", "compare"));
