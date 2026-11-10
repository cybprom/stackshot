import { starsCount } from "@/lib/card-text";
import { WALL_DRIFT, wallColumns, type WallSlot } from "@/lib/hero";
import { homeDoc, WALL_CAPTION_REPOS } from "@/lib/home";
import { COPY } from "@/lib/site";
import { COLORS, LAYER_COLORS, TERMINAL, TILES } from "@/lib/tokens";

const MINI_TILES = 10;
const palette = COLORS.dark;
const layers = LAYER_COLORS.dark;

/**
 * A drawing of a card rather than a card scaled down, so 48 of them stay cheap as server
 * HTML. The sizes are this illustration's own; every colour is a token. Dark only, so the
 * panel stays the one lit object in the room.
 */
function WallCard({ slot }: { slot: WallSlot }) {
  const doc = homeDoc(slot.ref);
  const tiles = slot.style === "tiles";
  const symbols = doc.layers
    .flatMap((layer) =>
      layer.items.map((item) => ({ symbol: item.symbol, display: item.display, category: layer.category })),
    )
    .slice(0, MINI_TILES);

  return (
    <div
      className="mb-6 box-border flex w-full flex-col gap-2.5 rounded-plate border p-4"
      style={{ backgroundColor: tiles ? TILES.surface.dark : TERMINAL.surface.dark, borderColor: palette.rule }}
    >
      {tiles ? null : (
        <div className="font-mono text-[9px]" style={{ color: palette.inkMuted }}>
          <span style={{ color: palette.accent }}>$</span> stackshot {doc.owner}/{doc.repo}
        </div>
      )}

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          {tiles ? (
            <div className="truncate font-mono text-[9px]" style={{ color: palette.inkMuted }}>
              {doc.owner} /
            </div>
          ) : null}
          <div
            className="truncate font-display text-[17px] font-bold leading-tight tracking-[-0.02em]"
            style={{ color: palette.ink }}
          >
            {doc.repo}
          </div>
        </div>
        <div className="shrink-0 text-right font-mono text-[9px] leading-tight" style={{ color: palette.inkMuted }}>
          {doc.language ? <div>{doc.language}</div> : null}
          <div>{starsCount(doc.stars)} stars</div>
        </div>
      </div>

      {tiles ? (
        <div className="grid grid-cols-5 gap-1.5">
          {symbols.map(({ symbol, display, category }, index) => (
            <div
              key={`${symbol}-${index}`}
              className="flex h-12.5 min-w-0 flex-col justify-between rounded-tile border-t-2 px-1 py-1"
              // Transparent sides mitre the bar's ends, as the card draws them.
              style={{
                backgroundColor: layers[category].tint,
                borderTopColor: layers[category].color,
                borderInline: "2px solid transparent",
              }}
            >
              <span
                className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]"
                style={{ color: layers[category].color }}
              >
                {symbol}
              </span>
              <span className="truncate text-[7px] leading-none" style={{ color: palette.ink }}>
                {display}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 font-mono text-[10px] leading-4">
          {doc.layers.map((layer, index) => (
            <div key={layer.category} className="overflow-hidden whitespace-nowrap">
              <span style={{ color: palette.inkMuted }}>{index === doc.layers.length - 1 ? "└─" : "├─"}</span>{" "}
              <span className="font-bold" style={{ color: layers[layer.category].color }}>
                {layer.category}
              </span>{" "}
              <span style={{ color: palette.ink }}>{layer.items.map((item) => item.display).join("  ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Six columns of committed docs, so nothing here can be cold (ADR-0035). They move only
 * with the page's scroll, each at its own rate, and step back when the field has focus.
 * `aria-hidden`: two hundred package names before the field would be the worst of this page.
 */
export function GalleryWall() {
  return (
    <div aria-hidden className="wall pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-6">
      {wallColumns().map((column, index) => {
        const drift = WALL_DRIFT[index];
        return (
          <div
            key={index}
            className="wall-column w-75 shrink-0"
            style={
              { "--wall-rate": drift?.rate ?? 0.1, marginTop: -(drift?.offset ?? 0) } as React.CSSProperties
            }
          >
            {column.map((slot, position) => (
              <WallCard key={`${slot.ref}-${position}`} slot={slot} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function WallCaption() {
  return (
    <div className="wall-caption site-grid relative mt-5 hidden items-baseline justify-between gap-6 lg:flex">
      <span className="site-small text-ink">{COPY.wallCaption}</span>
      <span className="site-status flex gap-5 text-ink">
        {WALL_CAPTION_REPOS.map((ref) => (
          <span key={ref}>{ref}</span>
        ))}
      </span>
    </div>
  );
}
