"use client";

import { useGenerator } from "@/app/site/generator/context";
import { TRY_REPOS } from "@/lib/home";
import { COPY } from "@/lib/site";

/**
 * The second way in, for a visitor with no repo of their own in mind. The three are the
 * ones the wall and the intro card already show, so nothing here resolves a repo the
 * committed data has not already been checked against.
 */
export function TryRow() {
  const { pick, busy } = useGenerator();

  return (
    <div className="site-body flex flex-wrap items-center gap-2 text-ink-muted">
      <span>{COPY.try}</span>
      {TRY_REPOS.map((ref) => (
        <button
          key={ref}
          type="button"
          disabled={busy}
          onClick={() => pick(`github.com/${ref}`)}
          className="site-label motion-state rounded-pill border border-rule px-3 py-1.5 text-ink hover:border-ink disabled:opacity-60"
        >
          {ref}
        </button>
      ))}
    </div>
  );
}
