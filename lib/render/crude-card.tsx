import { CARD, COLORS, TYPE, type Theme } from "@/lib/tokens";

// Milestone 0 scaffolding, alive until ADR-0011 — not dead code. The /spike/theme
// and /spike/ttl paths stay pinned to this so their bytes hold still while step 7
// replaces the real card. See ROADMAP "Spike URLs".
//
// variant 2 is step 6's single byte change: it must be visible at README size or
// there is nothing to time.
export function CrudeCard({ theme, variant }: { theme: Theme; variant: 1 | 2 }) {
  const c = COLORS[theme];
  const label = theme.toUpperCase();

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
      <div style={{ display: "flex", height: CARD.accentBar, backgroundColor: c.accent }} />

      <div style={{ display: "flex", flex: 1, padding: CARD.padding }}>
        <div
          style={{
            display: "flex",
            width: CARD.gutter,
            borderRight: `${CARD.border}px solid ${c.ink}`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: CARD.headerBand,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: TYPE.owner.family,
                fontSize: TYPE.owner.size,
                fontWeight: TYPE.owner.weight,
                color: c.inkMuted,
              }}
            >
              stackshot/
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: TYPE.display.family,
                fontSize: TYPE.display.size,
                fontWeight: TYPE.display.weight,
                letterSpacing: TYPE.display.tracking * TYPE.display.size,
                color: c.ink,
              }}
            >
              camo-spike
            </div>
          </div>

          {CARD.separators.map((w, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flex: 1,
                minHeight: CARD.bandMinHeight,
                borderTop: `${w}px solid ${c.ink}`,
                alignItems: "center",
                justifyContent: i === 1 ? "center" : "flex-start",
              }}
            >
              {i === 1 ? (
                <div
                  style={{
                    display: "flex",
                    fontFamily: TYPE.display.family,
                    fontSize: 96,
                    fontWeight: TYPE.display.weight,
                    letterSpacing: 8,
                    color: c.ink,
                  }}
                >
                  {label}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    fontFamily: TYPE.item.family,
                    fontSize: TYPE.item.size,
                    fontWeight: TYPE.item.weight,
                    color: c.ink,
                  }}
                >
                  {`band ${i + 1} — ${w}u rule above`}
                </div>
              )}
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
        <div style={{ display: "flex" }}>stackshot spike</div>
        <div style={{ display: "flex", color: c.accent, fontSize: 32 }}>{`V${variant}`}</div>
      </div>
    </div>
  );
}
