"use client";

import { useGenerator } from "@/app/site/generator/context";
import { COPY } from "@/lib/site";

/**
 * Pending and failed both land here, so a screen reader hears the same thing the page
 * shows. Never a skeleton of a card we cannot predict.
 */
export function GeneratorStatus() {
  const { phase, failure } = useGenerator();

  return (
    <p
      id="resolve-status"
      role="status"
      aria-live="polite"
      className="site-body max-w-[68ch]"
      hidden={phase === "idle" && !failure}
    >
      {phase !== "idle" ? (
        <span className="text-ink-muted">{phase === "reading" ? COPY.reading : COPY.drawing}</span>
      ) : failure ? (
        <>
          {/* The repo above the reason, the way the card's header sits above its message.
              DESIGN.md QUALITY FLOOR: every error names the repo. */}
          {failure.ref ? <span className="site-data block text-ink-muted">{failure.ref}</span> : null}
          <span className="text-error">{failure.reason}</span>
          {failure.detail ? <span className="text-ink-muted"> {failure.detail}</span> : null}
        </>
      ) : null}
    </p>
  );
}
