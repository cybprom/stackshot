import { foundCount, type PreviewDoc } from "@/lib/preview";
import { COPY } from "@/lib/site";

/**
 * One row per item, grouped by layer. The symbol leads the row because this section is the
 * key to the Tiles card above it as much as it is the home of the descriptions (ADR-0009).
 */
export function StackFound({ doc }: { doc: PreviewDoc }) {
  return (
    <section className="site-grid py-16 sm:py-20">
      <div className="flex flex-col gap-2 border-b border-rule pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="site-section">{COPY.stackTitle}</h2>
          <p className="site-small hidden text-ink-muted sm:block">{COPY.stackIntro}</p>
        </div>
        <p className="site-status text-ink-muted">{COPY.stackMeta(foundCount(doc), `${doc.owner}/${doc.repo}`)}</p>
      </div>

      {/* Columns, not a grid: a layer's rows stay together across the gutter. */}
      <div className="mt-8 gap-x-18 lg:[column-count:2]">
        {doc.layers.map((layer) => (
          <div key={layer.category} className="mb-10 break-inside-avoid">
            <h3 className="site-control flex items-center gap-2 text-ink">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-xs"
                style={{ backgroundColor: `var(--layer-${layer.category})` }}
              />
              {COPY.layer[layer.category]}
              <span className="site-status text-ink-muted">{layer.items.length + layer.overflow}</span>
            </h3>

            <dl className="mt-2">
              {layer.items.map((item) => (
                <div key={item.id} className="flex items-start gap-3.5 border-b border-rule py-3">
                  <dt className="sr-only">{item.display}</dt>
                  <dd
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile border-t-2 font-display text-[15px] font-extrabold leading-none tracking-[-0.03em]"
                    style={{
                      backgroundColor: `var(--layer-${layer.category}-tint)`,
                      borderTopColor: `var(--layer-${layer.category})`,
                      // Transparent sides mitre the bar's ends, as the card draws them.
                      borderInline: "2px solid transparent",
                      color: `var(--layer-${layer.category})`,
                    }}
                  >
                    {item.symbol}
                  </dd>
                  <dd className="min-w-0 flex-1">
                    <span className="site-name text-ink">{item.display}</span>
                    {item.version ? <span className="site-status ml-2 text-ink-muted">{item.version}</span> : null}
                    <span className="site-small block text-ink-muted">{item.description}</span>
                  </dd>
                </div>
              ))}
            </dl>

            {layer.overflow > 0 ? (
              <p className="site-status mt-3 text-ink-muted">{COPY.overflow(layer.overflow)}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
