import type { ReactNode } from "react";
import { CARD, TYPE, displaySize } from "@/lib/tokens";

type Colors = Record<string, string>;

/**
 * The domain, as a literal rather than `SITE_ORIGIN`: `lib/render` must not read an
 * environment variable, or one doc would render different bytes in two deployments (I2).
 * Every style shows this line in `TYPE.meta`; where it sits is the frame's business.
 */
export const DOMAIN = "stackshot.ilerioluwa.com";

/** Header content, so every style rounds a star count the same way. */
export function starsLabel(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k stars`;
  return `${n} stars`;
}

// The Datasheet's frame, shared with the error card — not every style's. A style's frame
// is its own: Tiles has no accent bar, a decorative border and its own radius (ADR-0030).
// Here the accent bar, header, footer and padding are what leaves the bands ~71u of
// headroom before a rotated gutter label overlaps its neighbour, so they are one component
// rather than two copies. GOTCHAS 021.
export function SheetFrame({ c, footerRight, children }: { c: Colors; footerRight?: string; children: ReactNode }) {
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

      <div style={{ display: "flex", flex: 1, padding: CARD.padding }}>{children}</div>

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
        <div style={{ display: "flex" }}>{DOMAIN}</div>
        {footerRight ? <div style={{ display: "flex" }}>{footerRight}</div> : null}
      </div>
    </div>
  );
}

// The gutter's header-band spacer, so both cards' two columns start their bands in step.
export function GutterHeadSpacer() {
  return <div style={{ display: "flex", height: CARD.headerBand }} />;
}

/**
 * Owner over repo name, with right-aligned metadata. Shared by every style, so the name's
 * size ladder and its two-line clamp are applied in one place — an error card names a
 * repo just as a real card does, and a Tiles card names it the same way.
 *
 * `band` is the Datasheet's fixed header band. Omitted, the header is content-height,
 * which is what a style with no band system wants.
 */
export function CardHeader({ owner, repo, meta, c, band }: { owner: string; repo: string; meta: string[]; c: Colors; band?: number }) {
  const size = displaySize(repo);
  return (
    <div
      style={{
        display: "flex",
        ...(band === undefined ? {} : { height: band }),
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 1 }}>
        <div
          style={{
            display: "flex",
            fontFamily: TYPE.owner.family,
            fontSize: TYPE.owner.size,
            fontWeight: TYPE.owner.weight,
            color: c.inkMuted,
          }}
        >
          {`${owner}/`}
        </div>
        <div
          style={{
            // block, not flex: satori only honours lineClamp on a block container.
            display: "block",
            fontFamily: TYPE.display.family,
            fontSize: size,
            fontWeight: TYPE.display.weight,
            lineHeight: TYPE.display.lineHeight,
            letterSpacing: TYPE.display.tracking * size,
            color: c.ink,
            // Repo names have no spaces, so a name with no hyphens or dots has no break
            // opportunity at all and runs off the canvas rather than wrapping.
            wordBreak: "break-word",
            // The band holds the owner line plus two name lines; a third overruns the 8u
            // rule below. Clamping by measure rather than by character count, so the
            // ellipsis is unreachable for an ordinary 100-character name at 36.
            lineClamp: 2,
          }}
        >
          {repo}
        </div>
      </div>
      {meta.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, paddingLeft: 24 }}>
          {meta.map((line) => (
            <div
              key={line}
              style={{
                display: "flex",
                fontFamily: TYPE.owner.family,
                fontSize: TYPE.owner.size,
                fontWeight: TYPE.owner.weight,
                color: c.inkMuted,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Rotation about the element's own centre, so the band's flex-derived height is
// never needed at author time. nowrap/flexShrink keep the label off the 72u wall.
// See GOTCHAS 004.
export function GutterLabel({ label, ink }: { label: string; ink: string }) {
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
