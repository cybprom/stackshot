import type { PreviewDoc } from "@/lib/preview";
import { COPY } from "@/lib/site";

/**
 * What Stackshot found: one row per item, grouped by layer, two columns on desktop.
 *
 * **The symbol leads the row rather than decorating it.** This section is the key to the
 * Tiles card above it as much as it is the home of the descriptions (ADR-0009) — a reader
 * who cannot decode `Nj` on a 208-unit tile looks here, and a symbol in the last column
 * would not answer them.
 */
export function StackFound({ doc }: { doc: PreviewDoc }) {
  return (
    <section className="w-full border-t border-rule px-6 py-16 sm:px-14 sm:py-18">
      <h2 className="site-section">{COPY.stackTitle}</h2>

      {/* Columns, not a grid: a layer's rows stay together and the browser balances the
          two halves, so a four-item layer never straddles the gutter mid-list. */}
      <div className="mt-8 gap-x-14 lg:[column-count:2]">
        {doc.layers.map((layer) => (
          <div key={layer.category} className="mb-10 break-inside-avoid">
            {/* Sentence case. The card's gutter is the only all-caps in the project. */}
            <h3 className="site-label flex items-center gap-1.75 text-ink-muted">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-xs"
                style={{ backgroundColor: `var(--layer-${layer.category})` }}
              />
              {COPY.layer[layer.category]}
            </h3>

            <dl className="mt-3 border-t border-rule">
              {layer.items.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-rule py-3">
                  <dt className="sr-only">{item.display}</dt>
                  <dd
                    aria-hidden
                    className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-sm font-display text-[13px] font-extrabold leading-none tracking-[-0.03em]"
                    style={{
                      backgroundColor: `var(--layer-${layer.category}-tint)`,
                      color: `var(--layer-${layer.category})`,
                    }}
                  >
                    {item.symbol}
                  </dd>
                  <dd className="min-w-0 flex-1">
                    <span className="site-data text-ink">{item.display}</span>
                    {item.version ? <span className="site-data text-ink-muted"> {item.version}</span> : null}
                    <span className="site-body block text-ink-muted">{item.description}</span>
                  </dd>
                </div>
              ))}
            </dl>

            {layer.overflow > 0 ? (
              <p className="site-data mt-3 text-ink-muted">{COPY.overflow(layer.overflow)}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
