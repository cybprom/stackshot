import { CARD, COLORS, ERROR_CARD_HEIGHT, TERMINAL, TILES, TYPE, type Theme } from "@/lib/tokens";
import { ERROR_COPY, type FailureReason } from "@/lib/failure";
import { DEFAULT_STYLE, type CardStyle } from "@/lib/card-style";
import {
  CardHeader,
  DomainLine,
  GutterHeadSpacer,
  GutterLabel,
  SheetFrame,
  TerminalFrame,
  TerminalPrompt,
  TerminalTitle,
  TilesFrame,
} from "@/lib/render/chrome";
import { renderToPng } from "@/lib/render/render";
import type { CardHeight } from "@/lib/render/render";

export type ErrorCardProps = {
  reason: FailureReason;
  owner: string;
  repo: string;
  theme: Theme;
  /** The style that was asked for. Its frame is the one a failing embed should show. */
  style?: CardStyle;
};

type Colors = Record<string, string>;
type Copy = (typeof ERROR_COPY)[FailureReason];

/**
 * The only way this card should be rasterized: the Datasheet's is shorter than a real
 * card, and a caller that reaches for renderToPng directly gets it at 800 with an empty
 * lower half.
 */
export function renderErrorCard(props: ErrorCardProps): Promise<Buffer> {
  return renderToPng(ErrorCard(props), errorHeight(props.style ?? DEFAULT_STYLE));
}

/**
 * The Datasheet's error card is a derived 518 because its bands are fixed; the styles that
 * draw their real cards at content height draw their error cards the same way. GOTCHAS 050
 * is why this is spelled rather than defaulted.
 */
function errorHeight(style: CardStyle): CardHeight {
  return style === "tiles" || style === "terminal" ? "content" : ERROR_CARD_HEIGHT;
}

/**
 * One content tree in the requested style's frame (ADR-0033). The same object as a real
 * card with different content: same palette, no red (ADR-0007). What a failing embed must
 * not show is a frame from a style the reader never asked for — Tiles is the default and
 * `card-*.png` is pinned to it.
 */
export function ErrorCard({ reason, owner, repo, theme, style = DEFAULT_STYLE }: ErrorCardProps) {
  const c = COLORS[theme];
  const copy = ERROR_COPY[reason];

  if (style === "tiles") return <TilesError copy={copy} owner={owner} repo={repo} c={c} theme={theme} />;
  if (style === "terminal") return <TerminalError copy={copy} owner={owner} repo={repo} c={c} theme={theme} />;
  return <SheetError copy={copy} owner={owner} repo={repo} c={c} />;
}

/**
 * The failure, and the whole of what a frame without a gutter says. The label leads at the
 * gutter label's own type step — the same signage, unrotated — because the failure is the
 * card's message and the bottom row is metadata. ADR-0033.
 */
function ErrorBody({ copy, c, marginTop }: { copy: Copy; c: Colors; marginTop: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop }}>
      <div
        style={{
          display: "flex",
          fontFamily: TYPE.gutter.family,
          fontSize: TYPE.gutter.size,
          fontWeight: TYPE.gutter.weight,
          lineHeight: TYPE.gutter.lineHeight,
          letterSpacing: TYPE.gutter.tracking * TYPE.gutter.size,
          color: c.ink,
        }}
      >
        {copy.label}
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: CARD.measure,
          marginTop: 16,
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
          display: "flex",
          maxWidth: CARD.measure,
          marginTop: 24,
          fontFamily: TYPE.errorDetail.family,
          fontSize: TYPE.errorDetail.size,
          fontWeight: TYPE.errorDetail.weight,
          lineHeight: TYPE.errorDetail.lineHeight,
          color: c.inkMuted,
        }}
      >
        {copy.detail}
      </div>
    </div>
  );
}

/** Tiles' frame, its header, and the domain where the legend-and-domain row would be. */
function TilesError({
  copy,
  owner,
  repo,
  c,
  theme,
}: {
  copy: Copy;
  owner: string;
  repo: string;
  c: Colors;
  theme: Theme;
}) {
  return (
    <TilesFrame c={c} theme={theme}>
      {/* No meta: a repo that would not resolve has no language and no star count. */}
      <CardHeader owner={owner} repo={repo} meta={[]} c={c} />
      <ErrorBody copy={copy} c={c} marginTop={TILES.section} />
      {/* The legend decodes layer colour, and there are no layers — so the row keeps the
          domain alone, at the edge it sits on when there is a legend beside it. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: TILES.section }}>
        <DomainLine c={c} family />
      </div>
    </TilesFrame>
  );
}

/** Terminal's frame and prompt: a repo Stackshot was asked about and could not read. */
function TerminalError({
  copy,
  owner,
  repo,
  c,
  theme,
}: {
  copy: Copy;
  owner: string;
  repo: string;
  c: Colors;
  theme: Theme;
}) {
  return (
    <TerminalFrame c={c} theme={theme}>
      <TerminalPrompt repoRef={`${owner}/${repo}`} c={c} />
      {/* No meta: a repo that would not resolve has no language and no star count. */}
      <TerminalTitle repoRef={`${owner}/${repo}`} meta={[]} c={c} />
      <ErrorBody copy={copy} c={c} marginTop={TERMINAL.gap} />
      <DomainLine c={c} marginTop={TERMINAL.gap} />
    </TerminalFrame>
  );
}

/**
 * The Datasheet's, unchanged and still the frame Tags borrows: its bands are fixed, so the
 * reason keeps the rotated gutter label and the card keeps its derived 518.
 */
function SheetError({ copy, owner, repo, c }: { copy: Copy; owner: string; repo: string; c: Colors }) {
  return (
    <SheetFrame c={c}>
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
        <CardHeader owner={owner} repo={repo} meta={[]} c={c} band={CARD.headerBand} />

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
              fontFamily: TYPE.errorDetail.family,
              fontSize: TYPE.errorDetail.size,
              fontWeight: TYPE.errorDetail.weight,
              lineHeight: TYPE.errorDetail.lineHeight,
              color: c.inkMuted,
            }}
          >
            {copy.detail}
          </div>
        </div>
      </div>
    </SheetFrame>
  );
}
