import { PreviewCardHeader } from "@/app/preview/card-header";
import { DOMAIN, LAYER_NAME, starsLabel } from "@/lib/card-text";
import { family, legendDelay, PREVIEW_WIDTH, tileDelay, type PreviewDoc } from "@/lib/preview";
import { layoutTiles } from "@/lib/render/tiles-layout";
import { CARD, COLORS, LAYER_COLORS, TILES, TYPE, type Theme } from "@/lib/tokens";
import type { Category, StackItem } from "@/lib/stack-map/types";

type Colors = Record<string, string>;

/**
 * `lib/render/tiles.tsx` in HTML, for the site's preview.
 *
 * **Every number here is a card unit used as a CSS px**, straight from the tokens: this
 * tree is laid out 1200 wide and the plate scales it by `w / 1200`, so a 64 here is the
 * same 64 Satori is given. It reads oddly against the rest of the site's CSS and that is
 * the price of the two implementations not drifting by arithmetic. ADR-0032.
 */

/** The reveal is a class plus a per-item delay; absent, the card is simply there. */
type Reveal = { className: string; delay: number } | undefined;

const revealProps = (reveal: Reveal) => ({
  className: reveal?.className,
  animationDelay: reveal ? `${reveal.delay}ms` : undefined,
});

function Tile({
  item,
  color,
  tint,
  c,
  reveal,
}: {
  item: StackItem;
  color: string;
  tint: string;
  c: Colors;
  reveal: Reveal;
}) {
  const { className, animationDelay } = revealProps(reveal);
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        animationDelay,
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
          fontFamily: family(TYPE.version.family),
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
          fontFamily: family(TYPE.symbol.family),
          fontSize: TYPE.symbol.size,
          fontWeight: TYPE.symbol.weight,
          lineHeight: TYPE.symbol.lineHeight,
          letterSpacing: TYPE.symbol.tracking * TYPE.symbol.size,
          color,
        }}
      >
        {item.symbol}
      </div>
      {/* The same two-line clamp the PNG uses — maxHeight against a 26u line box, not a
          line count — so a long display name clips at the same word in both. */}
      <div
        style={{
          maxHeight: TILES.nameMaxHeight,
          overflow: "hidden",
          fontFamily: family(TYPE.tileName.family),
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

function MoreTile({
  hidden,
  color,
  c,
  reveal,
}: {
  hidden: number;
  color: string;
  c: Colors;
  reveal: Reveal;
}) {
  const { className, animationDelay } = revealProps(reveal);
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxSizing: "border-box",
        animationDelay,
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
          fontFamily: family(TYPE.symbol.family),
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
          fontFamily: family(TYPE.tileName.family),
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
              width: TILES.swatch,
              height: TILES.swatch,
              borderRadius: TILES.swatchRadius,
              marginRight: 12,
              backgroundColor: LAYER_COLORS[theme][category].color,
            }}
          />
          <div
            style={{
              fontFamily: family(TYPE.legend.family),
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

export function TilesPreviewCard({
  doc,
  theme,
  reveal = false,
}: {
  doc: PreviewDoc;
  theme: Theme;
  reveal?: boolean;
}) {
  const c = COLORS[theme];
  // The renderer's own allocator, not a second three-row cap: the preview shows the same
  // fifteen cells the PNG will, or the crossfade is a jump rather than a check.
  const layers = layoutTiles(doc.layers.slice(0, 4));
  const meta = [doc.language, starsLabel(doc.stars)].filter((line): line is string => line !== null);

  // One running index across the layers, because the grid wraps as one flow and the
  // stagger follows the eye rather than the data.
  let cell = 0;
  const tileReveal = (): Reveal => (reveal ? { className: "reveal-tile", delay: tileDelay(cell++) } : undefined);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // The PNG's canvas is 1200 and its frame fills it; here the frame declares it.
        width: PREVIEW_WIDTH,
        boxSizing: "border-box",
        backgroundColor: TILES.surface[theme],
        border: `${TILES.border}px solid ${c.rule}`,
        borderRadius: TILES.radius,
        padding: CARD.padding,
      }}
    >
      <div className={reveal ? "reveal-row" : undefined}>
        <PreviewCardHeader owner={doc.owner} repo={doc.repo} meta={meta} c={c} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: TILES.gap, marginTop: TILES.section }}>
        {layers.flatMap((layer) => {
          const { color, tint } = LAYER_COLORS[theme][layer.category];
          return [
            ...layer.items.map((item) => (
              <Tile key={item.id} item={item} color={color} tint={tint} c={c} reveal={tileReveal()} />
            )),
            ...(layer.hidden > 0
              ? [
                  <MoreTile
                    key={`${layer.category}-more`}
                    hidden={layer.hidden}
                    color={color}
                    c={c}
                    reveal={tileReveal()}
                  />,
                ]
              : []),
          ];
        })}
      </div>

      <div
        className={reveal ? "reveal-row" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: TILES.section,
          animationDelay: reveal ? `${legendDelay(cell)}ms` : undefined,
        }}
      >
        <Legend categories={layers.map((l) => l.category)} theme={theme} c={c} />
        <div
          style={{
            fontFamily: family(TYPE.meta.family),
            fontSize: TYPE.meta.size,
            fontWeight: TYPE.meta.weight,
            lineHeight: TYPE.meta.lineHeight,
            letterSpacing: TYPE.meta.tracking * TYPE.meta.size,
            color: c.inkMuted,
          }}
        >
          {DOMAIN}
        </div>
      </div>
    </div>
  );
}
