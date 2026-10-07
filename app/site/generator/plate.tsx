"use client";

import { CardPlate } from "@/app/preview/card-plate";
import { useGenerator } from "@/app/site/generator/context";
import { COPY } from "@/lib/site";

/**
 * One slot, contents swapped — the page does not move when it answers you. Before a
 * resolve the card shown is the intro card's own bytes, rendered into `public/` at build
 * time, so the homepage never waits on the card route. DESIGN.md SELF-CRITIQUE, M3 #4.
 *
 * No key and no arrival animation: the per-style reveal is the arrival now (ADR-0032
 * amended MOTION's list), and remounting on a new repo would throw away the plate's
 * measurement and collapse its height for a frame.
 */
export function GeneratorPlate({ caption = true }: { caption?: boolean }) {
  const { doc, phase, onSettled, style, mode, png, resolved, shown } = useGenerator();

  return (
    <figure className="w-full">
      <CardPlate
        doc={doc}
        busy={phase === "reading"}
        reveal={phase === "drawing"}
        onSettled={onSettled}
        style={style}
        mode={mode}
        png={png}
      />
      {caption ? (
        <figcaption className="mt-4 max-w-[68ch]">
          {resolved ? (
            // The full name, never truncated: the card's header may have had to clip it.
            <span className="site-data text-ink-muted">
              {shown.owner}/{shown.repo}
            </span>
          ) : (
            <span className="site-body text-ink-muted">{COPY.exampleCaption}</span>
          )}
        </figcaption>
      ) : null}
    </figure>
  );
}
