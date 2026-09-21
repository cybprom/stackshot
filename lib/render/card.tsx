import { CARD, COLORS, TYPE, displaySize, type Theme } from "@/lib/tokens";
import type { StackDoc, StackLayer } from "@/lib/stack-map/types";

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

// Rotation about the element's own centre, so the band's flex-derived height is
// never needed at author time. nowrap/flexShrink keep the label off the 72u wall.
// See GOTCHAS 004.
function GutterLabel({ label, ink }: { label: string; ink: string }) {
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
          color: ink,
        }}
      >
        {label}
      </div>
    </div>
  );
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: c.surface,
        border: `${CARD.border}px solid ${c.ink}`,
        borderRadius: CARD.radius,
      }}
    >
      <div
        style={{
          display: "flex",
          height: CARD.accentBar,
          backgroundColor: c.accent,
          borderTopLeftRadius: CARD.radius,
          borderTopRightRadius: CARD.radius,
        }}
      />

      <div style={{ display: "flex", flex: 1, padding: CARD.padding }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: CARD.gutter,
            borderRight: `${CARD.border}px solid ${c.ink}`,
          }}
        >
          <div style={{ display: "flex", height: CARD.headerBand }} />
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
          <div
            style={{
              display: "flex",
              height: CARD.headerBand,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: TYPE.owner.family,
                  fontSize: TYPE.owner.size,
                  fontWeight: TYPE.owner.weight,
                  color: c.inkMuted,
                }}
              >
                {`${doc.owner}/`}
              </div>
              <div
                style={{
                  display: "flex",
                  fontFamily: TYPE.display.family,
                  fontSize: displaySize(doc.repo),
                  fontWeight: TYPE.display.weight,
                  letterSpacing: TYPE.display.tracking * displaySize(doc.repo),
                  color: c.ink,
                }}
              >
                {doc.repo}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              {doc.language ? (
                <div
                  style={{
                    display: "flex",
                    fontFamily: TYPE.owner.family,
                    fontSize: TYPE.owner.size,
                    fontWeight: TYPE.owner.weight,
                    color: c.inkMuted,
                  }}
                >
                  {doc.language}
                </div>
              ) : null}
              <div
                style={{
                  display: "flex",
                  fontFamily: TYPE.owner.family,
                  fontSize: TYPE.owner.size,
                  fontWeight: TYPE.owner.weight,
                  color: c.inkMuted,
                }}
              >
                {stars(doc.stars)}
              </div>
            </div>
          </div>

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
      </div>

      <div
        style={{
          display: "flex",
          height: CARD.footer,
          paddingLeft: CARD.padding,
          paddingRight: CARD.padding,
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: TYPE.meta.family,
          fontSize: TYPE.meta.size,
          fontWeight: TYPE.meta.weight,
          letterSpacing: TYPE.meta.tracking * TYPE.meta.size,
          color: c.inkMuted,
        }}
      >
        <div style={{ display: "flex" }}>stackshot.ilerioluwa.com</div>
        <div style={{ display: "flex" }}>{`stack as of ${doc.asOf}`}</div>
      </div>
    </div>
  );
}
