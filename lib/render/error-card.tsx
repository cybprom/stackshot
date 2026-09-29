import { CARD, COLORS, ERROR_CARD_HEIGHT, TYPE, type Theme } from "@/lib/tokens";
import { ERROR_COPY, type FailureReason } from "@/lib/failure";
import { CardHeader, CardShell, GutterHeadSpacer, GutterLabel } from "@/lib/render/chrome";
import { renderToPng } from "@/lib/render/render";

export type ErrorCardProps = { reason: FailureReason; owner: string; repo: string; theme: Theme };

/**
 * The only way this card should be rasterized: it is shorter than a real card, and a
 * caller that reaches for renderToPng directly gets it at 800 with an empty lower half.
 */
export function renderErrorCard(props: ErrorCardProps): Promise<Buffer> {
  return renderToPng(ErrorCard(props), ERROR_CARD_HEIGHT);
}

/** The same object as a real card with different content: same palette, no red. ADR-0007. */
export function ErrorCard({ reason, owner, repo, theme }: ErrorCardProps) {
  const c = COLORS[theme];
  const copy = ERROR_COPY[reason];

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
        {/* A fixed box, not the whole column: the label centres inside whatever band it
            is given, and a full-height band would park it far below the message it
            names. */}
        <div
          style={{
            display: "flex",
            position: "relative",
            height: CARD.errorBand,
            borderTop: `${CARD.separators[0]}px solid ${c.surface}`,
          }}
        >
          <GutterLabel label={copy.label} ink={c.ink} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 24 }}>
        <CardHeader owner={owner} repo={repo} meta={[]} c={c} />

        {/* Top-aligned, so the band's empty lower half reads as space on a document
            rather than as a notice centred in a void. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: CARD.errorBand,
            borderTop: `${CARD.separators[0]}px solid ${c.ink}`,
            paddingTop: 32,
          }}
        >
          <div
            style={{
              // On the text, never on the band above: that band carries the 8u rule, and
              // a measure-width rule stops short of the card's edge.
              maxWidth: CARD.measure,
              display: "flex",
              marginBottom: 24,
              fontFamily: TYPE.item.family,
              fontSize: TYPE.item.size,
              fontWeight: TYPE.item.weight,
              lineHeight: TYPE.item.lineHeight,
              letterSpacing: TYPE.item.tracking * TYPE.item.size,
              color: c.ink,
            }}
          >
            {copy.reason}
          </div>
          <div
            style={{
              maxWidth: CARD.measure,
              display: "flex",
              fontFamily: TYPE.version.family,
              fontSize: TYPE.version.size,
              fontWeight: TYPE.version.weight,
              lineHeight: TYPE.version.lineHeight,
              color: c.inkMuted,
            }}
          >
            {copy.detail}
          </div>
        </div>
      </div>
    </CardShell>
  );
}
