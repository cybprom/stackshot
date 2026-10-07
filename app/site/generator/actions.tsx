"use client";

import { useGenerator } from "@/app/site/generator/context";
import { COPY } from "@/lib/site";

/**
 * What you leave with: the markdown, and the two PNGs.
 *
 * **The snippet is behind a disclosure rather than always on the page.** Both designs put
 * a button here and no code block, which is right for the visitor who only wants to paste
 * it — but a clipboard write can be refused, and a button that copies something nobody
 * can see has no fallback. So the markup is one press away, and a failed copy opens it
 * and says to select it. The illustrative block in "One snippet. Both themes." stays
 * uncopyable: this is still the only snippet anyone acts on.
 */
export function GeneratorActions() {
  const { copied, onCopy, snippet, snippetOpen, toggleSnippet, png } = useGenerator();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onCopy}
          className={`site-label motion-state rounded-control border-[1.5px] px-6 py-3 ${
            copied === "done" ? "border-success bg-success text-surface" : "border-ink bg-ink text-surface"
          }`}
        >
          {copied === "done" ? COPY.copied : COPY.copyMarkdown}
        </button>

        {/* Same-origin by construction — SITE_ORIGIN serves this page too, and the intro
            card's bytes sit in public/ — which is what makes `download` save rather than
            navigate. */}
        <a
          href={png.light}
          download
          className="site-label motion-state rounded-control border-[1.5px] border-ink px-6 py-3 text-ink"
        >
          {COPY.downloadLight}
        </a>
        <a
          href={png.dark}
          download
          className="site-label motion-state rounded-control border-[1.5px] border-ink px-6 py-3 text-ink"
        >
          {COPY.downloadDark}
        </a>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={toggleSnippet}
          aria-expanded={snippetOpen}
          aria-controls="snippet-markup"
          className="site-label motion-state self-start text-ink-muted underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
        >
          {snippetOpen ? COPY.hideSnippet : COPY.showSnippet}
        </button>

        {snippetOpen ? (
          <>
            <pre
              id="snippet-markup"
              className="site-code overflow-x-auto rounded-snippet border-[1.5px] border-rule p-4 text-ink"
            >
              {snippet}
            </pre>
            <p className="site-body text-ink-muted" hidden={copied !== "failed"}>
              {COPY.copyFailed}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
