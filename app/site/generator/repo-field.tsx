"use client";

import { useGenerator } from "@/app/site/generator/context";
import { useScramble } from "@/app/site/generator/use-scramble";
import { COPY } from "@/lib/site";

/** The field and its button. No width and no margin of its own: the hero places it. */
export function RepoField() {
  const { url, setUrl, onSubmit, phase, failure, reduceMotion } = useGenerator();

  const label = phase === "reading" ? COPY.reading : phase === "drawing" ? COPY.drawing : COPY.generate;
  const scramble = useScramble(label, reduceMotion);

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
        {/* The label resolves character by character on hover, on focus, and whenever the
            phase changes it. `aria-label` carries the real words and the span is hidden,
            so the accessible name never becomes punctuation — and `min-w` holds the
            button still while three labels of different lengths pass through it. Commit
            Mono does the rest: a proportional face would jitter on every frame. */}
        <button
          type="submit"
          disabled={phase === "reading"}
          aria-label={label}
          onMouseEnter={scramble.start}
          onMouseLeave={scramble.stop}
          onFocus={scramble.start}
          onBlur={scramble.stop}
          className="site-label motion-state min-w-39 rounded-control border-[1.5px] border-ink bg-ink px-6 py-3 text-surface disabled:opacity-60"
        >
          <span aria-hidden>{scramble.text}</span>
        </button>
      </div>
    </form>
  );
}
