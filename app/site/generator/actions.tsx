"use client";

import { DownloadIcon, ChevronIcon } from "@/app/site/marks";
import { useGenerator } from "@/app/site/generator/context";
import { track } from "@/app/site/generator/track";
import { SnippetCode } from "@/app/site/snippet-code";
import { COPY } from "@/lib/site";

/**
 * What you leave with: the markdown and the two PNGs. The snippet sits behind a disclosure
 * rather than on the page, and a refused clipboard write opens it, so there is always
 * something to select by hand. Held invisible until a real card exists, so the panel keeps
 * its height and nobody can copy the example card's snippet.
 */
export function GeneratorActions() {
  const { copied, onCopy, snippet, snippetOpen, toggleSnippet, png, doc, shown, style } = useGenerator();
  const done = copied === "done";

  return (
    <div className={`flex w-full flex-col ${doc ? "" : "invisible"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="site-control press inline-grid h-11 flex-1 place-items-center rounded-control bg-ink px-4.5 text-surface sm:flex-none"
        >
          {/* Both labels share one cell, so the button holds the wider one's width. */}
          <span aria-hidden className={`swap col-start-1 row-start-1 ${done ? "" : "swap-on"}`}>
            {COPY.copyMarkdown}
          </span>
          <span aria-hidden className={`swap col-start-1 row-start-1 ${done ? "swap-on" : ""}`}>
            {COPY.copied}
          </span>
          <span className="sr-only" aria-live="polite">
            {done ? COPY.copied : COPY.copyMarkdown}
          </span>
        </button>

        {/* Same-origin, which is what makes `download` save rather than navigate. */}
        {[
          { href: png.light, theme: "light", copy: COPY.downloadLight },
          { href: png.dark, theme: "dark", copy: COPY.downloadDark },
        ].map(({ href, theme, copy }) => (
          <a
            key={copy.label}
            href={href}
            download={`${shown.repo}-${style}-${theme}.png`}
            onClick={() => track(theme === "light" ? "download_light" : "download_dark", style)}
            aria-label={copy.label}
            className="site-control press inline-flex h-11 items-center gap-2 rounded-control border border-rule bg-field px-3 text-ink hover:border-ink sm:px-3.5"
          >
            <DownloadIcon />
            <span>
              {copy.short}
              <span className="hidden sm:inline">{copy.rest}</span>
            </span>
          </a>
        ))}

        <button
          type="button"
          onClick={toggleSnippet}
          aria-expanded={snippetOpen}
          aria-controls="snippet-markup"
          className="site-control motion-state inline-flex h-11 w-full items-center gap-2 text-ink sm:ml-auto sm:w-auto"
        >
          <ChevronIcon className={`chevron ${snippetOpen ? "chevron-open" : ""}`} />
          {snippetOpen ? COPY.hideSnippet : COPY.showSnippet}
        </button>
      </div>

      <div className={`disclose ${snippetOpen ? "disclose-open" : ""}`} inert={!snippetOpen}>
        <div className="min-h-0 overflow-hidden">
          <div className="disclose-code pt-2">
            <div className="overflow-hidden rounded-snippet">
              <SnippetCode id="snippet-markup" snippet={snippet} />
            </div>
            {copied === "failed" ? <p className="site-small mt-2 text-ink-muted">{COPY.copyFailed}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
