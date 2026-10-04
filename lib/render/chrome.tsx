import type { ReactNode } from "react";
import { DOMAIN } from "@/lib/card-text";
import { CARD, TERMINAL, TILES, TYPE, displaySize, type Theme } from "@/lib/tokens";

type Colors = Record<string, string>;

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

/**
 * Tiles' frame: a decorative hairline, its own radius, no accent bar, content-height.
 * ADR-0030.
 *
 * Here rather than in `tiles.tsx` for the reason `SheetFrame` is here — it is shared with
 * the error card now, so a failing `tiles-*.png` is framed as Tiles instead of as a style
 * the reader never asked for. ADR-0033.
 */
export function TilesFrame({ c, theme, children }: { c: Colors; theme: Theme; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: TILES.surface[theme],
        border: `${TILES.border}px solid ${c.rule}`,
        borderRadius: TILES.radius,
        padding: CARD.padding,
      }}
    >
      {children}
    </div>
  );
}

/** Terminal's frame. Sets the mono family once, so its children state only their size. */
export function TerminalFrame({ c, theme, children }: { c: Colors; theme: Theme; children: ReactNode }) {
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
        padding: CARD.padding,
        fontFamily: TYPE.prompt.family,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Terminal's header, in two parts. Its own rather than `CardHeader`, because header
 * presentation belongs to the style (ADR-0031), and shared with the error card, which
 * names a repo Stackshot was asked about and could not read.
 *
 * **Two components and not one returning a fragment.** Satori walks the tree itself and
 * never terminates on a fragment where it expects a flex child — the render hangs rather
 * than failing, so nothing says so. GOTCHAS 058. Keeping them separate also leaves both
 * as direct children of the frame, which is the tree that already shipped.
 */
export function TerminalPrompt({ repoRef, c }: { repoRef: string; c: Colors }) {
  return (
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
        {`stackshot ${repoRef}`}
      </div>
    </div>
  );
}

export function TerminalTitle({ repoRef, meta, c }: { repoRef: string; meta: string[]; c: Colors }) {
  return (
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
        {repoRef}
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
  );
}

/**
 * The domain line in `TYPE.meta`, which every style says identically (ADR-0031). `family`
 * is stated only where the frame does not already set it, so the styles that inherit it
 * keep the bytes they had.
 */
export function DomainLine({ c, marginTop, family }: { c: Colors; marginTop?: number; family?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        ...(marginTop === undefined ? {} : { marginTop }),
        ...(family ? { fontFamily: TYPE.meta.family } : {}),
        fontSize: TYPE.meta.size,
        fontWeight: TYPE.meta.weight,
        lineHeight: TYPE.meta.lineHeight,
        letterSpacing: TYPE.meta.tracking * TYPE.meta.size,
        color: c.inkMuted,
      }}
    >
      {DOMAIN}
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
            // Stated, not left to the engine's default: Satori's and a browser's differ,
            // and the HTML preview has to land on the same line. GOTCHAS 052.
            lineHeight: TYPE.owner.lineHeight,
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
                lineHeight: TYPE.owner.lineHeight,
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
