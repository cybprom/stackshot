"use client";

import { GeneratorActions } from "@/app/site/generator/actions";
import { useGenerator } from "@/app/site/generator/context";
import { GeneratorPlate } from "@/app/site/generator/plate";
import { RepoField } from "@/app/site/generator/repo-field";
import { GeneratorStatus } from "@/app/site/generator/status";
import { StyleControls } from "@/app/site/generator/style-controls";
import { TryRow } from "@/app/site/generator/try-row";
import { PANEL_COLUMN, PANEL_WIDTH, panelCardWidth } from "@/lib/hero";
import { COPY } from "@/lib/site";

/**
 * Layout C's panel, held in front of the wall.
 *
 * **It opens rather than scrolling.** Generate — or a Try button, or the intro at 0.9s —
 * widens the panel to two columns and shrinks the column the form is in, both as
 * `max-width` transitions, and the card appears beside the controls instead of under
 * them. The same parts as A, placed differently; none of them assumes its own stacking.
 *
 * The three widths are inline custom properties rather than inline `width`, so
 * `globals.css` can answer the narrow case: below the width the open panel needs, the
 * columns stack and nothing slides. The plate inside measures the frame it is given and
 * is never told how wide it is.
 *
 * It is pinned light because it is the lit object in a dark room — see `.theme-light`.
 */
export function GeneratorPanel() {
  const { expanded } = useGenerator();

  return (
    <div
      className="theme-light panel-in panel-shell panel-shadow relative flex w-full gap-10 overflow-hidden rounded-panel p-6 sm:p-10"
      style={
        {
          "--panel-max": `${expanded ? PANEL_WIDTH.open : PANEL_WIDTH.closed}px`,
          "--panel-form-max": `${expanded ? PANEL_COLUMN.open : PANEL_COLUMN.closed}px`,
          "--panel-card-width": panelCardWidth(),
        } as React.CSSProperties
      }
    >
      <div className="panel-form flex w-full shrink-0 flex-col gap-5">
        <h1 className="site-panel-title">{COPY.heroC.headline}</h1>
        <p className="site-body max-w-[68ch] text-ink-muted">{COPY.heroC.intro}</p>
        <RepoField />
        <TryRow />

        {/* Mounted with the card, so the controls for a preview never appear before there
            is a preview to control. */}
        {expanded ? (
          <div className="reveal-row flex flex-col gap-3 border-t border-rule pt-4">
            <StyleControls />
            <GeneratorStatus />
          </div>
        ) : null}
      </div>

      {expanded ? (
        // Its final width from the first frame — see `panelCardWidth`. The panel clips it
        // until the opening makes room, so it slides into view at the size it will keep
        // rather than growing into it.
        <div className="panel-card reveal-row flex shrink-0 flex-col gap-3.5" style={{ animationDelay: "220ms" }}>
          <GeneratorPlate caption={false} />
          <GeneratorActions />
        </div>
      ) : null}
    </div>
  );
}
