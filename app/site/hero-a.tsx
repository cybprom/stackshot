import { GeneratorActions } from "@/app/site/generator/actions";
import { GeneratorPlate } from "@/app/site/generator/plate";
import { RepoField } from "@/app/site/generator/repo-field";
import { GeneratorStatus } from "@/app/site/generator/status";
import { StyleControls } from "@/app/site/generator/style-controls";
import { TryRow } from "@/app/site/generator/try-row";
import { LAYER_NAME } from "@/lib/card-text";
import { COPY } from "@/lib/site";
import type { Category } from "@/lib/stack-map/types";

const CATEGORIES = Object.keys(LAYER_NAME) as Category[];

/**
 * Layout A — Playground. The argument is laid out on the left and the thing it is arguing
 * for is on the right, already drawn, before anyone types anything.
 *
 * A server component: it places client parts but holds no state of its own, which is what
 * makes "only the hero differs" true in the file tree rather than only in the prose.
 * docs/design/site/a-playground.dc.html.
 */
export function HeroA() {
  return (
    <section className="mx-auto flex w-full max-w-360 flex-col gap-10 px-6 pb-18 pt-10 sm:px-14 lg:flex-row lg:gap-14">
      <div className="flex shrink-0 flex-col gap-6 pt-4 lg:w-125">
        <h1 className="site-hero">
          {COPY.heroA.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        {/* The four layers, named before the card is read rather than after.

            A dot and a label, not the card's tint behind the name: the tints were drawn
            against white and tooling's #EAECED is invisible on the page's #EDEEEA — the
            same fact that gave Tiles its own surface. This is the pattern "What Stackshot
            found" already uses for the same four words. */}
        <ul className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <li
              key={category}
              className="site-label flex items-center gap-1.75 rounded-pill border border-rule px-3 py-1.5 text-ink"
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-xs"
                style={{ backgroundColor: `var(--layer-${category})` }}
              />
              {LAYER_NAME[category]}
            </li>
          ))}
        </ul>

        <p className="site-body max-w-[68ch] text-ink-muted">{COPY.heroA.intro}</p>

        <div className="flex flex-col gap-4">
          <RepoField />
          <TryRow />
          <GeneratorStatus />
        </div>
      </div>

      <div className="flex min-w-0 grow flex-col gap-4">
        <StyleControls />
        <GeneratorPlate />
        <GeneratorActions />
      </div>
    </section>
  );
}
