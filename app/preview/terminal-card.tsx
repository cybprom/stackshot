import { DOMAIN, starsLabel } from "@/lib/card-text";
import { family, PREVIEW_WIDTH, type PreviewDoc } from "@/lib/preview";
import { COLORS, LAYER_COLORS, TERMINAL, TYPE, type Theme } from "@/lib/tokens";
import type { StackItem, StackLayer } from "@/lib/stack-map/types";

type Colors = Record<string, string>;

const MAX_LAYERS = 4;

/**
 * `lib/render/terminal.tsx` in HTML. Card units as CSS px, scaled by the plate — see
 * `tiles-card.tsx` for why the numbers read the way they do.
 */

function Item({ item, c }: { item: StackItem; c: Colors }) {
  return (
    <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap" }}>
      <div style={{ color: c.ink }}>{item.display}</div>
      {item.version ? <div style={{ marginLeft: 12, color: c.inkMuted }}>{item.version}</div> : null}
    </div>
  );
}

function Row({ layer, last, theme, c }: { layer: StackLayer; last: boolean; theme: Theme; c: Colors }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        fontFamily: family(TYPE.tree.family),
        fontSize: TYPE.tree.size,
        fontWeight: TYPE.tree.weight,
        lineHeight: TYPE.tree.lineHeight,
      }}
    >
      <div style={{ display: "flex", width: TERMINAL.labelWidth, flexShrink: 0, whiteSpace: "nowrap" }}>
        <div style={{ color: c.inkMuted }}>{last ? "└──" : "├──"}</div>
        <div
          style={{
            marginLeft: TERMINAL.glyphGap,
            fontWeight: 700,
            color: LAYER_COLORS[theme][layer.category].color,
          }}
        >
          {layer.category}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          flex: 1,
          minWidth: 0,
          columnGap: TERMINAL.itemGap,
          rowGap: TERMINAL.itemRowGap,
        }}
      >
        {layer.items.map((item) => (
          <Item key={item.id} item={item} c={c} />
        ))}
        {layer.overflow > 0 ? (
          <div style={{ flexShrink: 0, whiteSpace: "nowrap", color: c.inkMuted }}>
            {`+${layer.overflow} more`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TerminalPreviewCard({ doc, theme }: { doc: PreviewDoc; theme: Theme }) {
  const c = COLORS[theme];
  const layers = doc.layers.slice(0, MAX_LAYERS);
  const ref = `${doc.owner}/${doc.repo}`;
  const meta = [doc.language, starsLabel(doc.stars)].filter((line): line is string => line !== null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: PREVIEW_WIDTH,
        boxSizing: "border-box",
        backgroundColor: TERMINAL.surface[theme],
        border: `${TERMINAL.border}px solid ${c.rule}`,
        borderRadius: TERMINAL.radius,
        padding: 32,
        fontFamily: family(TYPE.prompt.family),
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: TYPE.prompt.size,
          fontWeight: TYPE.prompt.weight,
          lineHeight: TYPE.prompt.lineHeight,
        }}
      >
        <div style={{ fontWeight: 700, color: c.accent }}>$</div>
        <div
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 1,
            overflow: "hidden",
            marginLeft: TERMINAL.glyphGap,
            flex: 1,
            minWidth: 0,
            color: c.inkMuted,
            wordBreak: "break-all",
          }}
        >
          {`stackshot ${ref}`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginTop: TERMINAL.gap,
        }}
      >
        <div
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            flexShrink: 1,
            minWidth: 0,
            fontSize: TYPE.terminalName.size,
            fontWeight: TYPE.terminalName.weight,
            lineHeight: TYPE.terminalName.lineHeight,
            color: c.ink,
            wordBreak: "break-all",
          }}
        >
          {ref}
        </div>
        {meta.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              paddingLeft: 24,
              fontSize: TYPE.prompt.size,
              fontWeight: TYPE.prompt.weight,
              lineHeight: TYPE.prompt.lineHeight,
              color: c.inkMuted,
            }}
          >
            {meta.map((line, i) => (
              <div key={line} style={{ marginLeft: i === 0 ? 0 : TERMINAL.gap }}>
                {line}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          rowGap: TERMINAL.rowGap,
          marginTop: TERMINAL.gap,
        }}
      >
        {layers.map((layer, i) => (
          <Row key={layer.category} layer={layer} last={i === layers.length - 1} theme={theme} c={c} />
        ))}
      </div>

      <div
        style={{
          marginTop: TERMINAL.gap,
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
  );
}
