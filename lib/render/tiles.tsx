import { COLORS, LAYER_COLORS, TILES, TYPE, type Theme } from "@/lib/tokens";
import type { Category, StackDoc, StackItem } from "@/lib/stack-map/types";
import { LAYER_NAME, starsLabel } from "@/lib/card-text";
import { CardHeader, DomainLine, TilesFrame } from "@/lib/render/chrome";
import { layoutTiles } from "@/lib/render/tiles-layout";

type Colors = Record<string, string>;

function Tile({ item, color, tint, c }: { item: StackItem; color: string; tint: string; c: Colors }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        width: TILES.tile.width,
        height: TILES.tile.height,
        borderRadius: TILES.tile.radius,
        backgroundColor: tint,
        borderTop: `${TILES.tile.rule}px solid ${color}`,
        paddingTop: TILES.tile.padTop,
        paddingLeft: TILES.tile.padX,
        paddingRight: TILES.tile.padX,
        paddingBottom: TILES.tile.padBottom,
      }}
    >
      {/* Present even with no version, so symbols sit on one line across the grid. */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          height: TYPE.version.size,
          fontFamily: TYPE.version.family,
          fontSize: TYPE.version.size,
          fontWeight: TYPE.version.weight,
          lineHeight: 1,
          color: c.inkMuted,
        }}
      >
        {item.version ?? ""}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: TYPE.symbol.family,
          fontSize: TYPE.symbol.size,
          fontWeight: TYPE.symbol.weight,
          lineHeight: TYPE.symbol.lineHeight,
          letterSpacing: TYPE.symbol.tracking * TYPE.symbol.size,
          color,
        }}
      >
        {item.symbol}
      </div>
      {/* maxHeight + overflow is the two-line clamp, and it is load-bearing: without it a
          three-line name escapes the tile and paints over its corner. Phase 0, question 1. */}
      <div
        style={{
          display: "flex",
          maxHeight: TILES.nameMaxHeight,
          overflow: "hidden",
          fontFamily: TYPE.tileName.family,
          fontSize: TYPE.tileName.size,
          fontWeight: TYPE.tileName.weight,
          lineHeight: TYPE.tileName.lineHeight,
          color: c.ink,
        }}
      >
        {item.display}
      </div>
    </div>
  );
}

// Costs a cell like any other tile, which is why it sits in the symbol slot rather than
// in a size of its own. `lib/render/tiles-layout.ts` does the arithmetic.
function MoreTile({ hidden, color, c }: { hidden: number; color: string; c: Colors }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxSizing: "border-box",
        width: TILES.tile.width,
        height: TILES.tile.height,
        borderRadius: TILES.tile.radius,
        border: `${TILES.tile.dash}px dashed ${color}`,
        paddingLeft: TILES.tile.padX,
        paddingRight: TILES.tile.padX,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: TYPE.symbol.family,
          fontSize: TYPE.symbol.size,
          fontWeight: TYPE.symbol.weight,
          lineHeight: TYPE.symbol.lineHeight,
          letterSpacing: TYPE.symbol.tracking * TYPE.symbol.size,
          color,
        }}
      >
        {`+${hidden}`}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: TYPE.tileName.family,
          fontSize: TYPE.tileName.size,
          fontWeight: TYPE.tileName.weight,
          lineHeight: TYPE.tileName.lineHeight,
          color: c.inkMuted,
        }}
      >
        more
      </div>
    </div>
  );
}

// The card has no y-axis to read, so colour is the only thing encoding the layer and the
// legend is what decodes it. ADR-0029.
function Legend({ categories, theme, c }: { categories: Category[]; theme: Theme; c: Colors }) {
  return (
    <div style={{ display: "flex" }}>
      {categories.map((category, i) => (
        <div
          key={category}
          style={{
            display: "flex",
            alignItems: "center",
            marginRight: i === categories.length - 1 ? 0 : TILES.section,
          }}
        >
          <div
            style={{
              display: "flex",
              width: TILES.swatch,
              height: TILES.swatch,
              borderRadius: TILES.swatchRadius,
              marginRight: 12,
              backgroundColor: LAYER_COLORS[theme][category].color,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: TYPE.legend.family,
              fontSize: TYPE.legend.size,
              fontWeight: TYPE.legend.weight,
              lineHeight: TYPE.legend.lineHeight,
              color: c.inkMuted,
            }}
          >
            {LAYER_NAME[category]}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Tiles' own frame, and not the Datasheet's: a decorative border, its own radius, no
 * accent bar and no rule under the header. Content-height, so the card is as tall as the
 * rows it has. ADR-0030.
 */
export function TilesCard({ doc, theme }: { doc: StackDoc; theme: Theme }) {
  const c = COLORS[theme];
  const layers = layoutTiles(doc.layers.slice(0, 4));
  const meta = [doc.language, starsLabel(doc.stars)].filter((line): line is string => line !== null);

  return (
    <TilesFrame c={c} theme={theme}>
      <CardHeader owner={doc.owner} repo={doc.repo} meta={meta} c={c} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: TILES.gap, marginTop: TILES.section }}>
        {layers.flatMap((layer) => {
          const { color, tint } = LAYER_COLORS[theme][layer.category];
          return [
            ...layer.items.map((item) => (
              <Tile key={item.id} item={item} color={color} tint={tint} c={c} />
            )),
            ...(layer.hidden > 0
              ? [<MoreTile key={`${layer.category}-more`} hidden={layer.hidden} color={color} c={c} />]
              : []),
          ];
        })}
      </div>

      {/* The legend shares this row with the domain, which retires DESIGN's "the footer
          carries the domain and nothing else" for this style. ADR-0030. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: TILES.section,
        }}
      >
        <Legend categories={layers.map((l) => l.category)} theme={theme} c={c} />
        <DomainLine c={c} family />
      </div>
    </TilesFrame>
  );
}
