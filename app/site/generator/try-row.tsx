"use client";

import { useGenerator } from "@/app/site/generator/context";
import { TRY_REPOS } from "@/lib/home";
import { COPY } from "@/lib/site";

/** The second way in, for a visitor with no repo of their own in mind. */
export function TryRow() {
  const { pick, busy } = useGenerator();

  return (
    <div className="site-small flex items-center gap-1.5 text-ink-muted">
      <span>{COPY.try}</span>
      {TRY_REPOS.map((ref, index) => (
        <button
          key={ref}
          type="button"
          disabled={busy}
          onClick={() => pick(`github.com/${ref}`)}
          // Two on a phone, where a third would wrap onto its own line.
          className={`try-chip press site-chip rounded-tile border border-rule bg-field px-1.5 py-1 text-ink hover:border-ink disabled:opacity-60 ${index > 1 ? "hidden sm:block" : ""}`}
        >
          {ref}
        </button>
      ))}
    </div>
  );
}
