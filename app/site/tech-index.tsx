import { TechIndexControls } from "@/app/site/tech-index-controls";
import { LAYER_NAME } from "@/lib/card-text";
import { COPY } from "@/lib/site";
import { INDEX_ALL, TECH_COUNT, TECH_INDEX, countByCategory } from "@/lib/tech-index";
import type { Category } from "@/lib/stack-map/types";

/** Built on the server and handed down, so the full map never reaches the browser. ADR-0036. */
export function TechIndex() {
  const counts = countByCategory();
  const categories = Object.keys(LAYER_NAME) as Category[];

  return (
    <section className="site-grid flex flex-col gap-5 py-16 sm:py-20">
      <TechIndexControls
        entries={TECH_INDEX}
        chips={[
          { value: INDEX_ALL, label: COPY.indexAll, count: TECH_COUNT },
          ...categories.map((category) => ({
            value: category,
            label: LAYER_NAME[category],
            count: counts[category],
          })),
        ]}
      />
    </section>
  );
}
