"use client";

import { useGenerator } from "@/app/site/generator/context";
import { useScramble } from "@/app/site/generator/use-scramble";
import { COPY } from "@/lib/site";

/** Failures, and the one live region: the scrambling line beside the card stays silent. */
export function GeneratorStatus() {
  const { failure, statusText } = useGenerator();

  return (
    <div id="resolve-status" role="status" aria-live="polite" className="site-body empty:hidden">
      {statusText ? <span className="sr-only">{statusText}</span> : null}
      {failure ? (
        <p>
          {/* DESIGN.md QUALITY FLOOR: every error names the repo. */}
          {failure.repo ? (
            <span className="site-data block text-ink-muted">
              {failure.repo.owner}/{failure.repo.repo}
            </span>
          ) : null}
          <span className="text-error">{failure.reason}</span>
          {failure.detail ? <span className="text-ink-muted"> {failure.detail}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Above the card. Always one line tall, even empty: this line changing height as the
 * phase ended is what made the card jump at the PNG swap. GOTCHAS 065.
 */
export function PlateStatus() {
  const { busy, phase, statusText, drawnMs, reduceMotion } = useGenerator();
  const scramble = useScramble(statusText, reduceMotion, 1);
  const working = busy || phase === "drawing";

  return (
    <div aria-hidden className="site-status flex h-5 items-center justify-between gap-4 text-ink-muted">
      <span className="flex min-w-0 items-center gap-2">
        {statusText ? (
          <span className={`h-2 w-2 shrink-0 rounded-xs ${working ? "bg-accent" : "bg-success"}`} />
        ) : null}
        <span className="truncate">{scramble.text}</span>
      </span>
      {!working && drawnMs !== undefined ? <span className="hidden shrink-0 sm:inline">{COPY.statusDrawn(drawnMs)}</span> : null}
    </div>
  );
}
