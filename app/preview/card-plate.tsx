"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PREVIEW_CARDS } from "@/app/preview/cards";
import {
  PREVIEW_WIDTH,
  plateHeight,
  plateScale,
  type LaunchStyle,
  type PreviewDoc,
  type ThemeMode,
} from "@/lib/preview";
import { PREVIEW, type Theme } from "@/lib/tokens";

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
}: {
  doc?: PreviewDoc;
  style: LaunchStyle;
  mode: ThemeMode;
  /** Shown when there is no doc to draw — the example card, which the page has as bytes. */
  png?: { light: string; dark: string; alt: string };
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [units, setUnits] = useState(0);

  useMeasure(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      setScale(plateScale(frame.clientWidth));
      // offsetHeight is the laid-out height: a transform does not change it, so this is
      // the card's height in its own units whatever the plate is currently scaled to.
      // Both schemes lay out identically, so the in-flow one answers for both.
      if (treeRef.current) setUnits(treeRef.current.offsetHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    if (treeRef.current) observer.observe(treeRef.current);
    return () => observer.disconnect();
  }, [doc, style, mode]);

  const Card = PREVIEW_CARDS[style];
  const system = mode === "system";

  return (
    <div
      className="rounded-plate border-[1.5px] border-rule p-6"
      // A forced theme is one value and says so; System is the page's own media query.
      style={{ backgroundColor: system ? "var(--preview-page)" : PREVIEW.page[mode satisfies Theme] }}
    >
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden"
        style={doc ? { height: plateHeight(units, scale) } : undefined}
      >
        {doc ? (
          <div
            ref={treeRef}
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: PREVIEW_WIDTH, transform: `scale(${scale})` }}
          >
            {system ? (
              <>
                <div className="scheme-light">
                  <Card doc={doc} theme="light" />
                </div>
                <div className="scheme-dark">
                  <Card doc={doc} theme="dark" />
                </div>
              </>
            ) : (
              <Card doc={doc} theme={mode} />
            )}
          </div>
        ) : png ? (
          // Our own PNG, at a height that depends on the stack and can change to the error
          // card's. next/image wants dimensions we do not have and would re-encode bytes
          // whose exactness is the product.
          <picture>
            {system ? <source media="(prefers-color-scheme: dark)" srcSet={png.dark} /> : null}
            <img src={mode === "dark" ? png.dark : png.light} alt={png.alt} className="block w-full" />
          </picture>
        ) : null}
      </div>
    </div>
  );
}
