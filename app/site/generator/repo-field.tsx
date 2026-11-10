"use client";

import { useRef } from "react";
import { useGenerator } from "@/app/site/generator/context";
import { useScramble } from "@/app/site/generator/use-scramble";
import { COPY } from "@/lib/site";

// A pasted URL loses its host here so the fixed prefix never reads twice. Anything else
// stays as typed and is refused by parseRepoUrl with the usual message.
const withoutHost = (value: string) => value.replace(/^\s*(https?:\/\/)?(www\.)?github\.com\//i, "");

/** The field and its button. No width and no margin of its own: the hero places it. */
export function RepoField() {
  const { url, setUrl, onSubmit, phase, failure, reduceMotion } = useGenerator();

  const label = phase === "reading" ? COPY.reading : phase === "drawing" ? COPY.drawing : COPY.generate;
  const scramble = useScramble(label, reduceMotion);
  const inputRef = useRef<HTMLInputElement>(null);

  // On press and not on click, so an already focused field never blinks out first.
  const focusFromFrame = (event: React.MouseEvent) => {
    if (event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2.5">
      <label htmlFor="repo-url" className="site-control text-ink">
        {COPY.inputLabel}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
        <div
          onMouseDown={focusFromFrame}
          className="field motion-state site-data flex h-11 min-w-0 cursor-text items-center sm:flex-1 rounded-control border border-rule bg-field px-3.5"
        >
          {/* Ink against the placeholder's muted, so the fixed half reads as fixed. */}
          <span aria-hidden className="shrink-0 text-ink">
            {COPY.repoPrefix}
          </span>
          <input
            ref={inputRef}
            id="repo-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={withoutHost(url)}
            onChange={(event) => setUrl(withoutHost(event.target.value))}
            placeholder={COPY.placeholder}
            aria-describedby={failure ? "resolve-status" : undefined}
            className="h-full w-full min-w-0 bg-transparent text-ink placeholder:text-ink-muted"
          />
        </div>
        {/* Stays in Commit Mono: the label resolves character by character, and a
            proportional face would jitter on every frame. `aria-label` keeps the real words. */}
        <button
          type="submit"
          disabled={phase === "reading"}
          aria-label={label}
          onMouseEnter={scramble.start}
          onMouseLeave={scramble.stop}
          onFocus={scramble.start}
          onBlur={scramble.stop}
          className="site-label press h-11 min-w-39 rounded-control bg-ink px-5 text-surface disabled:opacity-60"
        >
          <span aria-hidden>{scramble.text}</span>
        </button>
      </div>
    </form>
  );
}
