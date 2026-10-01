// Puts each style's HTML preview beside its real PNG, at the same width, with a
// difference overlay. The crossfade on the site is the drift detector in production; this
// is the one you can read at a standstill. ADR-0032.
//
// Usage: pnpm tsx scripts/compare-styles.ts [outDir]
import { mkdirSync, writeFileSync } from "node:fs";
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

type Row = { label: string; style: LaunchStyle; theme: Theme; file: string; units: number };

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
          row: { label, style, theme, file, units },
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
  // difference pane is readable rather than a wall of thumbnails.
  for (const pane of panes) {
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
<section class="row ${row.theme}" style="--uh:${row.units}">
  <h2>${row.style} · ${row.label} · ${row.theme} · ${row.units}u</h2>
  <div class="cells">
    <figure><figcaption>HTML</figcaption>
      <div class="plate" style="background:${plate}"><div class="pane"><div class="tree">${html}</div></div></div>
    </figure>
    <figure><figcaption>PNG</figcaption>
      <div class="plate" style="background:${plate}"><img src="./${row.file}" alt=""></div>
    </figure>
    <figure><figcaption>difference — black is identical</figcaption>
      <div class="plate diff" style="background:${plate}">
        <div class="pane"><div class="tree">${html}</div></div>
        <img class="over" src="./${row.file}" alt="">
      </div>
    </figure>
  </div>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Preview vs PNG</title>
<style>
${CSS}
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
      ? `<div class="plate diff" style="background:${plate}"><div class="pane"><div class="tree">${html}</div></div><img class="over" src="./${row.file}" alt=""></div>`
      : `<div class="plate" style="background:${plate}"><div class="pane"><div class="tree">${html}</div></div></div>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${kind} ${row.style} ${row.label} ${row.theme}</title>
<style>
${CSS}
body{padding:0;background:${plate}}
.plate{--uh:${row.units}}
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

// The same two TTFs the renderer embeds and next/font serves, under the variable names
// `lib/preview.ts` maps to, so this file resolves exactly what the site will.
const CSS = `
@font-face{font-family:Archivo;src:url(../public/fonts/Archivo-Regular.ttf);font-weight:400}
@font-face{font-family:Archivo;src:url(../public/fonts/Archivo-SemiBold.ttf);font-weight:600}
@font-face{font-family:Archivo;src:url(../public/fonts/Archivo-Bold.ttf);font-weight:700}
@font-face{font-family:"Commit Mono";src:url(../public/fonts/CommitMono-400-Regular.ttf);font-weight:400}
@font-face{font-family:"Commit Mono";src:url(../public/fonts/CommitMono-700-Regular.ttf);font-weight:700}
:root{--font-archivo:Archivo;--font-commit-mono:"Commit Mono";--w:1100;--scale:calc(var(--w)/${PREVIEW_WIDTH})}
body{margin:0;padding:24px;background:#EDEEEA;font:14px/1.4 ui-sans-serif,system-ui,sans-serif;color:#101615}
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
img{display:block;width:calc(var(--w)*1px);height:auto}
.diff img.over{position:absolute;top:0;left:0;mix-blend-mode:difference}
.dark h2{color:#8B9490}
`;

main(process.argv[2] ?? join("cards", "compare"));
