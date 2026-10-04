import { COLORS, LAYER_COLORS, TERMINAL, TYPE, type Theme } from "@/lib/tokens";
import type { StackDoc, StackItem, StackLayer } from "@/lib/stack-map/types";
import { starsLabel } from "@/lib/card-text";
import { DomainLine, TerminalFrame, TerminalPrompt, TerminalTitle } from "@/lib/render/chrome";

type Colors = Record<string, string>;

const MAX_LAYERS = 4;

function Item({ item, c }: { item: StackItem; c: Colors }) {
  return (
    <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap" }}>
      <div style={{ display: "flex", color: c.ink }}>{item.display}</div>
      {item.version ? (
        <div style={{ display: "flex", marginLeft: 12, color: c.inkMuted }}>{item.version}</div>
      ) : null}
    </div>
  );
}

function Row({ layer, last, theme, c }: { layer: StackLayer; last: boolean; theme: Theme; c: Colors }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        fontFamily: TYPE.tree.family,
        fontSize: TYPE.tree.size,
        fontWeight: TYPE.tree.weight,
        lineHeight: TYPE.tree.lineHeight,
      }}
    >
      <div style={{ display: "flex", width: TERMINAL.labelWidth, flexShrink: 0, whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", color: c.inkMuted }}>{last ? "└──" : "├──"}</div>
        <div
          style={{
            display: "flex",
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
          <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap", color: c.inkMuted }}>
            {`+${layer.overflow} more`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Terminal's own frame and its own header: a prompt line and the repo as one mono string,
 * where the Datasheet and Tiles set the name in Archivo on the `displaySize` ladder. What
 * every style shares is the facts, the domain line and the layer colours. ADR-0031.
 */
export function TerminalCard({ doc, theme }: { doc: StackDoc; theme: Theme }) {
  const c = COLORS[theme];
  const layers = doc.layers.slice(0, MAX_LAYERS);
  const ref = `${doc.owner}/${doc.repo}`;
  const meta = [doc.language, starsLabel(doc.stars)].filter((line): line is string => line !== null);

  return (
    <TerminalFrame c={c} theme={theme}>
      <TerminalPrompt repoRef={ref} c={c} />
      <TerminalTitle repoRef={ref} meta={meta} c={c} />

      <div style={{ display: "flex", flexDirection: "column", rowGap: TERMINAL.rowGap, marginTop: TERMINAL.gap }}>
        {layers.map((layer, i) => (
          <Row key={layer.category} layer={layer} last={i === layers.length - 1} theme={theme} c={c} />
        ))}
      </div>

      <DomainLine c={c} marginTop={TERMINAL.gap} />
    </TerminalFrame>
  );
}
