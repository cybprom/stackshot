import { COPY } from "@/lib/site";

/**
 * "One snippet. Both themes." — the section that explains what the `<picture>` above it
 * actually does, next to a coloured rendering of it.
 *
 * The snippet here is **illustrative and deliberately not copyable**: the real one, with
 * this repo's URLs in it, sits by the Copy button in the generator. Two copyable snippets
 * on one page is two things to get wrong.
 */
export function SnippetPitch({ light, dark, alt }: { light: string; dark: string; alt: string }) {
  return (
    <section className="flex flex-col gap-10 border-t border-rule px-6 py-16 sm:px-14 lg:flex-row lg:gap-14 lg:py-16">
      <div className="flex shrink-0 flex-col gap-[14px] lg:w-[420px]">
        <h2 className="site-section">
          {COPY.snippetPitchTitle[0]}
          <br />
          {COPY.snippetPitchTitle[1]}
        </h2>
        <p className="site-body text-ink-muted">{COPY.snippetPitch}</p>
      </div>

      {/* aria-hidden with the real markup in a sr-only line: a screen reader reading angle
          brackets and two full URLs character by character is noise, and the generator's
          snippet is the one anybody acts on. */}
      <div className="min-w-0 flex-grow">
        <div
          aria-hidden
          className="site-code box-border overflow-x-auto rounded-snippet bg-code-surface px-5 py-[18px] leading-[1.75] text-code-ink"
        >
          <pre className="whitespace-pre">
            <span className="text-code-tag">&lt;picture&gt;</span>
            {"\n  "}
            <span className="text-code-tag">&lt;source</span> media=&quot;(prefers-color-scheme: dark)&quot;
            {"\n    "}srcset=&quot;<span className="text-code-string">{dark}</span>&quot;
            <span className="text-code-tag">&gt;</span>
            {"\n  "}
            <span className="text-code-tag">&lt;img</span> alt=&quot;{alt}&quot;
            {"\n    "}src=&quot;<span className="text-code-string">{light}</span>&quot;
            <span className="text-code-tag">&gt;</span>
            {"\n"}
            <span className="text-code-tag">&lt;/picture&gt;</span>
          </pre>
        </div>
        <p className="sr-only">{COPY.snippetPitch}</p>
      </div>
    </section>
  );
}
