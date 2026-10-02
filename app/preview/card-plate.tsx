"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PREVIEW_CARDS } from "@/app/preview/cards";
import {
  CURSOR_FADE_MS,
  PLATE_HEIGHT_MS,
  PNG_SETTLE_MS,
  PREVIEW_WIDTH,
  plateHeight,
  plateScale,
  revealCount,
  revealDuration,
  type LaunchStyle,
  type PreviewDoc,
  type ThemeMode,
} from "@/lib/preview";
import { COLORS, PREVIEW, type Theme } from "@/lib/tokens";

// A client component still renders once on the server, where there is no layout to read.
const useMeasure = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The card's plate: GitHub's page colour behind a card drawn at its own 1200-unit canvas
 * and scaled by one number. Measuring the tree gives both the scale's denominator and the
 * plate's height, so the height animation and the scaling are the same measurement rather
 * than two. ADR-0032.
 *
 * It takes no width, margin or placement of its own — it fills whatever it is put in, so
 * page layouts A and C can both hold it without it knowing which.
 *
 * **System draws both cards and lets CSS pick**, the way the snippet's `<picture>` does.
 * The alternative is a media query read in JavaScript, which cannot run before the first
 * paint and so shows the light card and corrects it. GOTCHAS 056.
 */
export function CardPlate({
  doc,
  style,
  mode,
  png,
  busy = false,
  reveal = false,
  onSettled,
}: {
  doc?: PreviewDoc;
  style: LaunchStyle;
  mode: ThemeMode;
  /** The card's own bytes: shown alone when there is no doc, crossfaded in when there is. */
  png?: { light: string; dark: string; alt: string };
  /** A resolve is in flight: the card on screen steps back and the sweep runs over it. */
  busy?: boolean;
  /** The card is arriving: its parts animate in on the style's own stagger. */
  reveal?: boolean;
  /** The PNG is up, or there was none to wait for. The page stops saying "Drawing card". */
  onSettled?: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  // One piece of state, so the scale and the height it multiplies can never be a frame
  // apart, and so whether a height eases travels with the height itself.
  const [frame, setFrame] = useState({ scale: 1, units: 0, eased: false });
  const pngLight = png?.light;
  const pngDark = png?.dark;
  // Only a resolved card crossfades. The example card is already its own bytes.
  const wantsPng = Boolean(doc && pngLight && pngDark);

  const [pngReady, setPngReady] = useState(!wantsPng);
  const [revealDone, setRevealDone] = useState(!reveal);
  const [cursorClosed, setCursorClosed] = useState(false);
  const [heightSettled, setHeightSettled] = useState(true);

  // A different card — a new resolve, or the same stack in another style — starts the
  // sequence over. Adjusted during render rather than in an effect, so the page never
  // paints the previous card's finished state for a frame first.
  const [shownCard, setShownCard] = useState({ doc, style });
  if (shownCard.doc !== doc || shownCard.style !== style) {
    setShownCard({ doc, style });
    setPngReady(!wantsPng);
    setRevealDone(!reveal);
    setCursorClosed(false);
    setHeightSettled(false);
  }

  /**
   * The PNG is requested only once the choice has settled, so flipping through the
   * switcher costs nothing and settling on one costs a render and no GitHub budget
   * (ADR-0029). Both themes are warmed, which is also M3's pre-warm: the CDN entry the
   * snippet hands out is the one this fetches.
   */
  useEffect(() => {
    if (!wantsPng || !pngLight || !pngDark) return;

    let live = true;
    const timer = setTimeout(() => {
      const warm = (src: string) => {
        const image = new Image();
        image.src = src;
        // A failed decode must not strand the page on "Drawing card": the HTML is a real
        // card, so the worst case is that it stays the one on screen.
        return image.decode().catch(() => undefined);
      };
      void Promise.all([warm(pngLight), warm(pngDark)]).then(() => {
        if (live) setPngReady(true);
      });
    }, PNG_SETTLE_MS);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [wantsPng, pngLight, pngDark]);

  /** The other gate: a fade that starts mid-reveal dissolves a half-drawn card. */
  useEffect(() => {
    if (!reveal || !doc) return;
    const timer = setTimeout(() => setRevealDone(true), revealDuration(style, revealCount(style, doc)));
    return () => clearTimeout(timer);
  }, [reveal, style, doc]);

  /**
   * The third gate: a fade that starts while the frame is still opening shows the two
   * cards at a size neither of them is, and `onSettled` would tell the page the card had
   * arrived while it was still moving. Held for every card change rather than only the
   * ones that move, which is a ceiling the other way — `PLATE_HEIGHT_MS` is asserted to
   * sit under the shortest reveal, so this gate never decides anything on its own.
   */
  useEffect(() => {
    if (!doc) return;
    const timer = setTimeout(() => setHeightSettled(true), PLATE_HEIGHT_MS);
    return () => clearTimeout(timer);
  }, [doc, style]);

  const ready = pngReady && revealDone && heightSettled;
  // Terminal's cursor fades out first, so the two transitions never overlap.
  const closing = ready && wantsPng && style === "terminal" && !cursorClosed;
  const layer = !ready ? "html" : closing ? "closing" : "png";

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setCursorClosed(true), CURSOR_FADE_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  const settled = ready && !closing;
  useEffect(() => {
    if (settled) onSettled?.();
  }, [settled, onSettled]);

  useMeasure(() => {
    const frameEl = frameRef.current;
    if (!frameEl) return;

    /**
     * `eased` is the caller's claim that a card changed. The height also has to actually
     * move, which is what keeps two cases out: the first card has nothing to grow from,
     * and a Light/Dark flip re-runs this effect while both schemes lay out identically,
     * so easing there would reopen the gates on a card that had already settled.
     */
    const measure = (eased: boolean) => {
      setFrame((previous) => {
        const scale = plateScale(frameEl.clientWidth);
        // offsetHeight is the laid-out height: a transform does not change it, so this is
        // the card's height in its own units whatever the plate is currently scaled to.
        // Both schemes lay out identically, so the in-flow one answers for both.
        const units = treeRef.current?.offsetHeight ?? previous.units;
        // Nothing moved, so keep the object — the observer's own first delivery reports
        // the size measure(true) just read, and would otherwise clear the ease it set.
        if (scale === previous.scale && units === previous.units) return previous;
        const moved = plateHeight(units, scale) !== plateHeight(previous.units, previous.scale);
        return { scale, units, eased: eased && moved && previous.units > 0 };
      });
    };

    measure(true);
    // Everything the observer reports afterwards is a resize or a reflow, and must land
    // instantly: an eased resize trails the pointer as the window edge is dragged.
    const observer = new ResizeObserver(() => measure(false));
    observer.observe(frameEl);
    if (treeRef.current) observer.observe(treeRef.current);
    return () => observer.disconnect();
  }, [doc, style, mode]);

  const Card = PREVIEW_CARDS[style];
  const system = mode === "system";
  // The cursor is the loading indicator: it blinks while the PNG is still coming and
  // fades as it arrives, so the settled card has none. ADR-0032.
  const cursor = !wantsPng || layer === "png" ? undefined : layer === "closing" ? "out" : "on";

  return (
    <div
      className="rounded-plate border-[1.5px] border-rule p-6"
      style={{
        // A forced theme is one value and says so; System is the page's own media query.
        backgroundColor: system ? "var(--preview-page)" : PREVIEW.page[mode satisfies Theme],
        // The sweep belongs to the card being previewed, not to the page, so a forced
        // theme sweeps in its own accent.
        ["--sweep-accent" as string]: system ? "var(--accent)" : COLORS[mode satisfies Theme].accent,
      }}
    >
      <div
        ref={frameRef}
        className={`relative w-full overflow-hidden${frame.eased ? " plate-height" : ""}`}
        style={doc ? { height: plateHeight(frame.units, frame.scale) } : undefined}
      >
        <div className={busy ? "card-dim" : "card-lit"}>
          {doc ? (
            <div
              ref={treeRef}
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: PREVIEW_WIDTH, transform: `scale(${frame.scale})` }}
            >
              {system ? (
                <>
                  <div className="scheme-light">
                    <Card doc={doc} theme="light" reveal={reveal} cursor={cursor} />
                  </div>
                  <div className="scheme-dark">
                    <Card doc={doc} theme="dark" reveal={reveal} cursor={cursor} />
                  </div>
                </>
              ) : (
                <Card doc={doc} theme={mode} reveal={reveal} cursor={cursor} />
              )}
            </div>
          ) : png ? (
            // Our own PNG, at a height that depends on the stack and can change to the
            // error card's. next/image wants dimensions we do not have and would re-encode
            // bytes whose exactness is the product.
            <picture>
              {system ? <source media="(prefers-color-scheme: dark)" srcSet={png.dark} /> : null}
              <img src={mode === "dark" ? png.dark : png.light} alt={png.alt} className="block w-full" />
            </picture>
          ) : null}
        </div>

        {/* The real bytes, over the HTML that stood in for them. It is only ever shown
            once decoded and once the reveal has finished, so this dissolves between two
            cards that already agree — and any disagreement is visible, which is the whole
            reason the preview is built twice. ADR-0032. */}
        {wantsPng && png ? (
          <div className="png-layer" style={{ opacity: layer === "png" ? 1 : 0 }} aria-hidden={layer !== "png"}>
            <picture>
              {system ? <source media="(prefers-color-scheme: dark)" srcSet={png.dark} /> : null}
              <img src={mode === "dark" ? png.dark : png.light} alt={png.alt} className="block w-full" />
            </picture>
          </div>
        ) : null}

        {/* Over the card, inside the plate's own rounding, so the line is clipped by the
            frame rather than crossing the page. */}
        {busy ? <div className="sweep" aria-hidden /> : null}
      </div>
    </div>
  );
}
