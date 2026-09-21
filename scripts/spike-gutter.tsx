import { writeFileSync, mkdirSync } from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { CARD, COLORS, TYPE } from "@/lib/tokens";
import { FONTS } from "@/lib/render/fonts";

// Step 3. Answers one question: do the rotated gutter labels work when the band
// height is flex-derived? Both DESIGN.md variants render side by side so the
// comparison is one look. Deleted or folded into the card once ADR-0011 is written.

const c = COLORS.light;
const LABELS = ["FRONTEND", "BACKEND", "INFRA", "TOOLING"];
// Unequal, because empty layers are omitted and survivors expand — equal bands
// would test a condition that never occurs.
const GROW = [3, 2, 1, 2];

function Band({ children, grow }: { children: React.ReactNode; grow: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexGrow: grow,
        flexBasis: 0,
        minHeight: 0,
        width: CARD.gutter,
        // Visible box so misalignment is seen, not inferred.
        border: `1px solid ${c.rule}`,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

// Rotation about the element's own centre: the wrapper fills the band and centres
// its child, so the band height is never needed at author time.
function Rotated({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          whiteSpace: "nowrap",
          transform: "rotate(-90deg)",
          transformOrigin: "center",
          fontFamily: TYPE.gutter.family,
          fontSize: TYPE.gutter.size,
          fontWeight: TYPE.gutter.weight,
          letterSpacing: TYPE.gutter.tracking * TYPE.gutter.size,
          color: c.ink,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Stacked({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label.split("").map((ch, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            fontFamily: TYPE.gutter.family,
            fontSize: 14,
            fontWeight: TYPE.gutter.weight,
            lineHeight: 1.15,
            color: c.ink,
          }}
        >
          {ch}
        </div>
      ))}
    </div>
  );
}

function Column({ mode, title }: { mode: "rotated" | "stacked"; title: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: CARD.padding }}>
      <div
        style={{
          display: "flex",
          height: 48,
          fontFamily: TYPE.meta.family,
          fontSize: TYPE.meta.size,
          fontWeight: TYPE.meta.weight,
          letterSpacing: TYPE.meta.tracking * TYPE.meta.size,
          color: c.inkMuted,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {LABELS.map((l, i) => (
            <Band key={l} grow={GROW[i]}>
              {mode === "rotated" ? <Rotated label={l} /> : <Stacked label={l} />}
            </Band>
          ))}
        </div>
      </div>
    </div>
  );
}

async function main() {
  const element = (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: c.surface,
      }}
    >
      <Column mode="rotated" title="rotated, transformOrigin center" />
      <Column mode="stacked" title="stacked letters, 14u" />
    </div>
  );

  const svg = await satori(element, {
    width: CARD.width,
    height: CARD.height,
    fonts: FONTS,
  });

  mkdirSync("docs/spike", { recursive: true });
  const png = new Resvg(svg, { fitTo: { mode: "zoom", value: 2 } }).render().asPng();
  writeFileSync("docs/spike/gutter-comparison.png", png);
  console.log(`docs/spike/gutter-comparison.png  ${png.length} bytes`);
}

main();
