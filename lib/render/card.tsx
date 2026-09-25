import { CARD, COLORS, TYPE, type Theme } from "@/lib/tokens";
import type { StackDoc, StackLayer } from "@/lib/stack-map/types";
import { CardHeader, CardShell, GutterHeadSpacer, GutterLabel } from "@/lib/render/chrome";

const GUTTER_LABEL: Record<StackLayer["category"], string> = {
  frontend: "FRONTEND",
  backend: "BACKEND",
  infra: "INFRA",
  tooling: "TOOLING",
};

function stars(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k stars`;
  return `${n} stars`;
}

function Item({ item, c }: { item: { display: string; version?: string }; c: Record<string, string> }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", marginRight: 32, marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          fontFamily: TYPE.item.family,
          fontSize: TYPE.item.size,
          fontWeight: TYPE.item.weight,
          letterSpacing: TYPE.item.tracking * TYPE.item.size,
          color: c.ink,
        }}
      >
        {item.display}
      </div>
      {item.version ? (
        <div
          style={{
            display: "flex",
            marginLeft: 8,
            fontFamily: TYPE.version.family,
            fontSize: TYPE.version.size,
            fontWeight: TYPE.version.weight,
            color: c.inkMuted,
          }}
        >
          {item.version}
        </div>
      ) : null}
    </div>
  );
}

export function Card({ doc, theme }: { doc: StackDoc; theme: Theme }) {
  const c = COLORS[theme];
  const layers = doc.layers.slice(0, 4);
  const meta = [doc.language, stars(doc.stars)].filter((line): line is string => line !== null);

  return (
    <CardShell c={c}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: CARD.gutter,
          borderRight: `${CARD.border}px solid ${c.ink}`,
        }}
      >
        <GutterHeadSpacer />
        {layers.map((layer, i) => (
          <div
            key={layer.category}
            style={{
              display: "flex",
              position: "relative",
              flexGrow: 1,
              flexBasis: 0,
              minHeight: CARD.bandMinHeight,
              // Surface-coloured, so it is invisible but still occupies the same
              // height as the content column's rule. Layer rules must not cross the
              // gutter, and the two columns have to stay in step.
              borderTop: `${CARD.separators[i]}px solid ${c.surface}`,
            }}
          >
            <GutterLabel label={GUTTER_LABEL[layer.category]} ink={c.ink} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 24 }}>
        <CardHeader owner={doc.owner} repo={doc.repo} meta={meta} c={c} />

        {layers.map((layer, i) => (
          <div
            key={layer.category}
            style={{
              display: "flex",
              flexGrow: 1,
              flexBasis: 0,
              minHeight: CARD.bandMinHeight,
              borderTop: `${CARD.separators[i]}px solid ${c.ink}`,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", paddingTop: 16, paddingBottom: 8 }}>
              {layer.items.slice(0, 6).map((it) => (
                <Item key={it.id} item={it} c={c} />
              ))}
              {layer.overflow > 0 ? (
                <div
                  style={{
                    display: "flex",
                    marginBottom: 8,
                    fontFamily: TYPE.overflow.family,
                    fontSize: TYPE.overflow.size,
                    fontWeight: TYPE.overflow.weight,
                    letterSpacing: TYPE.overflow.tracking * TYPE.overflow.size,
                    color: c.inkMuted,
                  }}
                >
                  {`+${layer.overflow} more`}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
