import { family } from "@/lib/preview";
import { TYPE, displaySize } from "@/lib/tokens";

type Colors = Record<string, string>;

/**
 * `lib/render/chrome.tsx`'s `CardHeader`, in HTML. Owner over repo name on the
 * `displaySize` ladder, metadata right-aligned — the same ladder and the same two-line
 * clamp, because the preview is a picture of the card and not an impression of it.
 *
 * Sizes are card units used as CSS px; the plate scales the whole tree by one number.
 */
export function PreviewCardHeader({
  owner,
  repo,
  meta,
  c,
}: {
  owner: string;
  repo: string;
  meta: string[];
  c: Colors;
}) {
  const size = displaySize(repo);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: family(TYPE.owner.family),
            fontSize: TYPE.owner.size,
            fontWeight: TYPE.owner.weight,
            lineHeight: TYPE.owner.lineHeight,
            color: c.inkMuted,
          }}
        >
          {`${owner}/`}
        </div>
        {/* Satori takes a bare `lineClamp`; a browser needs the -webkit- box. Same two
            lines, same ellipsis, different spelling. ADR-0032. */}
        <div
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            fontFamily: family(TYPE.display.family),
            fontSize: size,
            fontWeight: TYPE.display.weight,
            lineHeight: TYPE.display.lineHeight,
            letterSpacing: TYPE.display.tracking * size,
            color: c.ink,
            wordBreak: "break-word",
          }}
        >
          {repo}
        </div>
      </div>
      {meta.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
            paddingLeft: 24,
            fontFamily: family(TYPE.owner.family),
            fontSize: TYPE.owner.size,
            fontWeight: TYPE.owner.weight,
            lineHeight: TYPE.owner.lineHeight,
            color: c.inkMuted,
          }}
        >
          {meta.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
