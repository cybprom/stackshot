"use client";

import { useGenerator } from "@/app/site/generator/context";
import { COPY } from "@/lib/site";

/** The field and its button. No width and no margin of its own: the hero places it. */
export function RepoField() {
  const { url, setUrl, onSubmit, phase, failure } = useGenerator();

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
      <label htmlFor="repo-url" className="site-label text-ink-muted">
        {COPY.inputLabel}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="repo-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={COPY.placeholder}
          aria-describedby={failure ? "resolve-status" : undefined}
          className="site-data motion-state min-w-0 flex-1 rounded-control border-[1.5px] border-ink bg-transparent px-4 py-3 text-ink placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={phase === "reading"}
          className="site-label motion-state rounded-control border-[1.5px] border-ink bg-ink px-6 py-3 text-surface disabled:opacity-60"
        >
          {phase === "reading" ? COPY.reading : phase === "drawing" ? COPY.drawing : COPY.generate}
        </button>
      </div>
    </form>
  );
}
