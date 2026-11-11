"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { PREVIEW_CARDS } from "@/app/preview/cards";
import { BookIcon } from "@/app/site/marks";
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

// Only to size the frame once the bytes are up. Which card is drawn stays CSS's call,
// because script cannot answer before the first paint. GOTCHAS 056.
const DARK_QUERY = "(prefers-color-scheme: dark)";
function subscribeScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const usePrefersDark = () =>
  useSyncExternalStore(subscribeScheme, () => window.matchMedia(DARK_QUERY).matches, () => false);

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
  placeholder = false,
  busy = false,
  reveal = false,
  onSettled,
}: {
  doc?: PreviewDoc;
  style: LaunchStyle;
  mode: ThemeMode;
  /** The card's own bytes: shown alone when there is no doc, crossfaded in when there is. */
  png?: { light: string; dark: string; alt: string };
  /** `png` only sizes the empty slot and is never seen. */
  placeholder?: boolean;
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
  // Set only when the real bytes are a different height from the HTML, which means the
  // card route answered with an error card. The frame then follows the bytes.
  // Per theme: in System, either one may be the one on screen, and only one may be an error.
  const [pngUnits, setPngUnits] = useState<Record<Theme, number | null> | null>(null);
  const prefersDark = usePrefersDark();
  const [loadedImage, setLoadedImage] = useState<string | undefined>(undefined);
  // A first failure's error card is still fetching: the slot is blank, so keep the sweep.
  const waiting = !doc && !placeholder && loadedImage !== pngLight;
  const loading = busy || waiting;
  const [sweeping, setSweeping] = useState(loading);
  if (loading && !sweeping) setSweeping(true);

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
    setPngUnits(null);
  }

  /**
   * The PNG is requested only once the choice has settled, so flipping through the
   * switcher costs nothing and settling on one costs a render and no GitHub budget
   * (ADR-0029). Both themes are warmed, which also leaves both PNGs in Redis for the
   * snippet's first fetch. The URLs carry `?v=`, so the CDN entry is no longer shared.
   * ADR-0041.
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
        return image.decode().then(
          () => (image.naturalHeight / image.naturalWidth) * PREVIEW_WIDTH,
          () => null,
        );
      };
      void Promise.all([warm(pngLight), warm(pngDark)]).then(([light, dark]) => {
        if (!live) return;
        setPngUnits({ light, dark });
        setPngReady(true);
      });
    }, PNG_SETTLE_MS);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [wantsPng, pngLight, pngDark, doc]); // doc: resolving the same repo closes this gate, with the same URLs

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
  // Only while a card is arriving: the slot is also "settled" during a resolve, and
  // reporting that would end the loading state on the spot.
  const hasDoc = Boolean(doc);
  useEffect(() => {
    if (settled && hasDoc && reveal) onSettled?.();
  }, [settled, hasDoc, reveal, onSettled]);

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
  const shownTheme: Theme = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  const shownPngUnits = pngUnits?.[shownTheme] ?? null;
  const bytesDiffer = layer === "png" && shownPngUnits !== null && Math.abs(shownPngUnits - frame.units) > 2;
  const units = bytesDiffer ? shownPngUnits : frame.units;

  const system = mode === "system";
  // The cursor is the loading indicator: it blinks while the PNG is still coming and
  // fades as it arrives, so the settled card has none. ADR-0032.
  const cursor = !wantsPng || layer === "png" ? undefined : layer === "closing" ? "out" : "on";

  /** A card shown only as bytes has no tree to measure, so its image gives the height. */
  const onImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setLoadedImage(pngLight);
    const { naturalHeight, naturalWidth } = event.currentTarget;
    if (!(naturalWidth > 0)) return;
    const measured = (naturalHeight / naturalWidth) * PREVIEW_WIDTH;
    setFrame((previous) => ({ ...previous, units: measured, eased: previous.units > 0 }));
  };

  return (
    <div
      className="overflow-hidden rounded-plate border"
      style={{
        borderColor: system ? "var(--preview-rule)" : PREVIEW.rule[mode satisfies Theme],
        // A forced theme is one value and says so; System is the page's own media query.
        backgroundColor: system ? "var(--preview-page)" : PREVIEW.page[mode satisfies Theme],
        // The sweep belongs to the card being previewed, not to the page, so a forced
        // theme sweeps in its own accent.
        ["--sweep-accent" as string]: system ? "var(--accent)" : COLORS[mode satisfies Theme].accent,
      }}
    >
      {/* The GitHub page around the card, so this reads as the README it will live in. */}
      <div
        className="site-status flex h-10 items-center gap-2 border-b px-4"
        style={{
          borderColor: system ? "var(--preview-rule)" : PREVIEW.rule[mode satisfies Theme],
          color: system ? "var(--preview-ink-muted)" : PREVIEW.inkMuted[mode satisfies Theme],
        }}
      >
        <BookIcon />
        README.md
      </div>

      <div className="p-4 sm:p-5">
      <div
        ref={frameRef}
        className={`relative w-full overflow-hidden ${frame.eased || bytesDiffer ? "plate-height" : ""}`}
        style={units > 0 ? { height: plateHeight(units, frame.scale) } : undefined}
      >
        <div className={busy ? "card-dim" : "card-lit"}>
          {doc ? (
            <div
              ref={treeRef}
              // Hidden once the PNG is fully up, never merely covered by it. The two are
              // the same card and the same height when everything agrees — but an error
              // card is shorter than the card it replaces, and so is a PNG rendered from
              // a doc that has since changed, and the HTML then shows below the bytes as
              // a second card. GOTCHAS 063.
              // The space before the interpolation is load-bearing: Tailwind scans source
              // text for candidates, and `origin-top-left${...}` is not one. GOTCHAS 064.
              className={`absolute left-0 top-0 origin-top-left ${layer === "png" ? "card-html-out" : ""}`}
              aria-hidden={layer === "png"}
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
            // Keyed, or the browser keeps painting the old file until the new one has loaded.
            <picture key={pngLight} className={placeholder ? "invisible" : undefined}>
              {system ? <source media="(prefers-color-scheme: dark)" srcSet={png.dark} /> : null}
              <img
                src={mode === "dark" ? png.dark : png.light}
                alt={png.alt}
                className="block w-full"
                onLoad={onImage}
                onError={() => setLoadedImage(pngLight)}
              />
            </picture>
          ) : null}

        {/* The real bytes, over the HTML that stood in for them. It is only ever shown
            once decoded and once the reveal has finished, so this dissolves between two
            cards that already agree — and any disagreement is visible, which is the whole
            reason the preview is built twice. ADR-0032. */}
        {wantsPng && png ? (
          <div
            className="png-layer"
            // Fades in only. Fading out would dissolve the previous card's slot over the
            // new card's reveal, with the new file already in its src.
            style={{ opacity: layer === "png" ? 1 : 0, transition: layer === "png" ? undefined : "none" }}
            aria-hidden={layer !== "png"}
          >
            <picture>
              {system ? <source media="(prefers-color-scheme: dark)" srcSet={png.dark} /> : null}
              <img src={mode === "dark" ? png.dark : png.light} alt={png.alt} className="block w-full" />
            </picture>
          </div>
        ) : null}
        </div>

        {/* Clipped by the frame. It leaves the moment loading ends, wherever it is, because
            a line still travelling over a finished card reads as still loading. */}
        {sweeping ? (
          <div
            className={`sweep ${loading ? "" : "sweep-out"}`}
            aria-hidden
            onTransitionEnd={() => !loading && setSweeping(false)}
          />
        ) : null}
      </div>
      </div>
    </div>
  );
}
