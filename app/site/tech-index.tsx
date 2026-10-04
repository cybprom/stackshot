import { TechIndexControls } from "@/app/site/tech-index-controls";
import { LAYER_NAME } from "@/lib/card-text";
import { TECH_INDEX, countByCategory } from "@/lib/tech-index";
import type { Category } from "@/lib/stack-map/types";

/**
 * Every entry in the map, as a searchable grid of tiles.
 *
 * The index is built on the server from `STACK_MAP` and handed to the client component as
 * props, so the map itself — descriptions, aliases, weights, suppressions — never reaches
 * the browser. Only the five fields a tile and a search need do. ADR-0036.
 */
export function TechIndex() {
  const counts = countByCategory();
  const categories = Object.keys(LAYER_NAME) as Category[];

  return (
    <section className="flex flex-col gap-5 border-t border-rule px-6 py-16 sm:px-14 sm:py-[72px]">
      <TechIndexControls
        entries={TECH_INDEX}
        chips={categories.map((category) => ({ category, label: LAYER_NAME[category], count: counts[category] }))}
      />
    </section>
  );
}
