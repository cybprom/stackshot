import { starsLabel } from "@/lib/card-text";
import { wallColumns, type WallSlot } from "@/lib/hero";
import { homeDoc } from "@/lib/home";
import { COLORS, LAYER_COLORS, TERMINAL, TILES, type Theme } from "@/lib/tokens";

/** How many symbols a Tiles mini-card shows before it stops. Two rows of five. */
const MINI_TILES = 10;

/**
 * One card on the wall, at about a quarter of a real card's width.
 *
 * **It is a drawing of a card, not a card scaled down.** A real 1200-unit tree at 0.25
 * sets its package names at 7.5px, which is grey texture rather than a card — so the
 * mini-card keeps the symbol, the name and the stars at a size that reads at 300px and
 * drops everything else. The sizes below are this illustration's own and appear nowhere
 * else on the site. Every colour is still a token, per theme, because the wall shows
 * light and dark cards side by side on one dark ground.
 */
function WallCard({ slot }: { slot: WallSlot }) {
  const doc = homeDoc(slot.ref);
  const theme: Theme = slot.theme;
  const palette = COLORS[theme];
  const layers = LAYER_COLORS[theme];
  const surface = slot.style === "terminal" ? TERMINAL.surface[theme] : TILES.surface[theme];

  const symbols = doc.layers
    .flatMap((layer) => layer.items.map((item) => ({ symbol: item.symbol, category: layer.category })))
    .slice(0, MINI_TILES);

  return (
    <div
      className="mb-6 box-border flex w-full flex-col gap-2.5 rounded-plate border p-4"
      style={{ backgroundColor: surface, borderColor: palette.rule }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="overflow-hidden whitespace-nowrap font-display text-[16px] font-bold tracking-[-0.02em]"
          style={{ color: palette.ink }}
        >
          {doc.repo}
        </span>
        <span className="whitespace-nowrap font-mono text-[10px]" style={{ color: palette.inkMuted }}>
          {starsLabel(doc.stars)}
        </span>
      </div>

      {slot.style === "tiles" ? (
        <div className="flex flex-wrap gap-1.5">
          {symbols.map(({ symbol, category }, index) => (
            <div
              key={`${symbol}-${index}`}
              className="box-border h-11 w-12 rounded-tile border-t-2 px-1.5 py-1 font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]"
              style={{
                backgroundColor: layers[category].tint,
                borderTopColor: layers[category].color,
                color: layers[category].color,
              }}
            >
              {symbol}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 font-mono text-[11px] leading-4">
          {doc.layers.map((layer, index) => (
            <div key={layer.category} className="overflow-hidden whitespace-nowrap">
              <span style={{ color: palette.inkMuted }}>
                {index === doc.layers.length - 1 ? "└─" : "├─"}
              </span>{" "}
              <span className="font-bold" style={{ color: layers[layer.category].color }}>
                {layer.category}
              </span>{" "}
              <span style={{ color: palette.ink }}>
                {layer.items.map((item) => item.display).join("  ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The drifting wall behind C's panel: four columns of eight cards, each column holding
 * its eight twice so the loop closes on itself.
 *
 * **Every card is a committed `StackDoc` drawn as HTML** — no PNG, no request, nothing
 * that can be cold. ADR-0035, and the reason the homepage makes no GitHub call on any
 * path.
 *
 * `aria-hidden`, because it is sixteen repos' worth of decoration: a screen reader
 * reading two hundred package names before reaching the field would be the worst version
 * of this page. The names are all in the technology index further down, which is
 * navigable.
 */
export function GalleryWall() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-10 flex justify-center gap-6 opacity-50"
    >
      {wallColumns().map((column, index) => (
        <div
          key={index}
          // Every card carries its own bottom margin instead of the column carrying a
          // gap, so the column's height is exactly twice one lap. With a gap it is half a
          // gap short and the wall jumps at the seam.
          className={`w-75 shrink-0 ${index % 2 === 0 ? "wall-up" : "wall-down"}`}
          style={{ willChange: "transform" }}
        >
          {[...column, ...column].map((slot, position) => (
            <WallCard key={`${slot.ref}-${position}`} slot={slot} />
          ))}
        </div>
      ))}
    </div>
  );
}
