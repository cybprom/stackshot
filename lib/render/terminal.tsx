import { COLORS, LAYER_COLORS, TERMINAL, TYPE, type Theme } from "@/lib/tokens";
import type { StackDoc, StackItem, StackLayer } from "@/lib/stack-map/types";
import { DOMAIN, starsLabel } from "@/lib/card-text";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: TERMINAL.surface[theme],
        border: `${TERMINAL.border}px solid ${c.rule}`,
        borderRadius: TERMINAL.radius,
        padding: 32,
        fontFamily: TYPE.prompt.family,
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
        {/* The second use of `accent` on a card, after the Datasheet's bar: on a prompt
            the sigil is literal rather than decorative. ADR-0031. */}
        <div style={{ display: "flex", fontWeight: 700, color: c.accent }}>$</div>
        <div
          style={{
            display: "block",
            marginLeft: TERMINAL.glyphGap,
            flex: 1,
            minWidth: 0,
            color: c.inkMuted,
            // A repo name can be 100 characters, and a command line does not wrap.
            wordBreak: "break-all",
            lineClamp: 1,
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
            // block, not flex: satori only honours lineClamp on a block container.
            display: "block",
            flexShrink: 1,
            minWidth: 0,
            fontSize: TYPE.terminalName.size,
            fontWeight: TYPE.terminalName.weight,
            lineHeight: TYPE.terminalName.lineHeight,
            color: c.ink,
            // Mono and no size ladder, so the longest names clamp rather than step down.
            wordBreak: "break-all",
            lineClamp: 2,
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
              <div key={line} style={{ display: "flex", marginLeft: i === 0 ? 0 : TERMINAL.gap }}>
                {line}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", rowGap: TERMINAL.rowGap, marginTop: TERMINAL.gap }}>
        {layers.map((layer, i) => (
          <Row key={layer.category} layer={layer} last={i === layers.length - 1} theme={theme} c={c} />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: TERMINAL.gap,
          fontSize: TYPE.meta.size,
          fontWeight: TYPE.meta.weight,
          letterSpacing: TYPE.meta.tracking * TYPE.meta.size,
          color: c.inkMuted,
        }}
      >
        {DOMAIN}
      </div>
    </div>
  );
}
