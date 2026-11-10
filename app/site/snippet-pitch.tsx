import { SnippetCode } from "@/app/site/snippet-code";
import { COPY, introCardUrl } from "@/lib/site";

/**
 * What the `<picture>` actually does. Illustrative and deliberately not copyable: the real
 * snippet, with the visitor's own repo in it, is by the Copy button in the generator.
 */
export function SnippetPitch({ snippet }: { snippet: string }) {
  return (
    <section className="site-grid flex flex-col gap-8 py-16 lg:flex-row lg:gap-16 lg:py-20">
      <div className="flex shrink-0 flex-col gap-4 lg:w-105">
        <h2 className="site-section">
          {COPY.snippetPitchTitle[0]} <br className="hidden lg:block" />
          {COPY.snippetPitchTitle[1]}
        </h2>
        <p className="site-body text-ink-muted">{COPY.snippetPitch}</p>

        {/* Build-rendered bytes, so this pair never touches the card route. */}
        <div className="mt-1 hidden gap-2 lg:flex">
          {(["light", "dark"] as const).map((theme) => (
            <figure key={theme} className="flex w-40 flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- our exact bytes */}
              <img src={introCardUrl("tiles", theme)} alt="" className="block w-full rounded-tile" />
              <figcaption className="site-status text-ink-muted">prefers {theme}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="min-w-0 grow">
        <div aria-hidden className="overflow-hidden rounded-snippet border border-code-rule bg-code-surface">
          <div className="site-status flex h-11 items-center gap-3 border-b border-code-rule px-4 text-code-ink sm:px-5">
            <span>README.md</span>
            <span className="text-code-dim">HTML</span>
          </div>
          <SnippetCode snippet={snippet} />
        </div>
        <p className="sr-only">{COPY.snippetPitch}</p>
      </div>
    </section>
  );
}
