import { CARD, COLORS, ERROR_CARD_HEIGHT, TYPE, type Theme } from "@/lib/tokens";
import type { FailureReason } from "@/lib/failure";
import { CardHeader, CardShell, GutterHeadSpacer, GutterLabel } from "@/lib/render/chrome";
import { renderToPng } from "@/lib/render/render";

// Sentence case, active voice, no apology, and nothing that reads as the repo's fault.
// The gutter label is the one all-caps in the project, and here it names the state the
// way a layer label names a layer. DESIGN.md UI COPY RULES, SIGNATURE.
export const ERROR_COPY: Record<FailureReason, { label: string; reason: string; detail: string }> = {
  not_found: {
    label: "NOT FOUND",
    reason: "Stackshot couldn't find this repo.",
    detail: "It may be private, renamed, or deleted.",
  },
  no_manifests: {
    label: "NO MANIFESTS",
    reason: "Stackshot found no manifest files here.",
    // Names every root manifest lib/github/tree.ts selects. tests/error-card.test.ts
    // fails if that list and this sentence drift apart.
    detail:
      "It reads package.json, pyproject.toml, requirements.txt, go.mod, Cargo.toml, Gemfile and composer.json on the default branch.",
  },
  nothing_mapped: {
    label: "NOTHING MAPPED",
    reason: "Stackshot didn't recognize anything this repo uses.",
    // The unmapped log is the backlog, so this is a fact rather than a hedge.
    detail: "Its list of technologies is curated and still growing.",
  },
  rate_limited: {
    label: "RATE LIMITED",
    reason: "Stackshot is over its GitHub rate limit.",
    // Never a countdown: resetAt is a clock reading, and the render has to stay pure (I2).
    detail: "Try again shortly. Nothing is wrong with this repo.",
  },
  unavailable: {
    label: "UNAVAILABLE",
    reason: "Stackshot couldn't read this repo right now.",
    detail: "Try again shortly. Nothing is wrong with this repo.",
  },
};

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
