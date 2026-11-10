"use client";

import { GeneratorActions } from "@/app/site/generator/actions";
import { useGenerator } from "@/app/site/generator/context";
import { GeneratorPlate } from "@/app/site/generator/plate";
import { RepoField } from "@/app/site/generator/repo-field";
import { GeneratorStatus, PlateStatus } from "@/app/site/generator/status";
import { StyleControls } from "@/app/site/generator/style-controls";
import { TryRow } from "@/app/site/generator/try-row";
import { usePanelOpen } from "@/app/site/generator/use-panel-open";
import { PANEL_COLUMN, PANEL_OPEN_MS, PANEL_WIDTH, panelCardWidth } from "@/lib/hero";
import { COPY } from "@/lib/site";

/**
 * The panel in front of the wall, pinned light because it is the lit object in a dark
 * room. The first Generate opens it to two columns, and it never closes or resizes again.
 */
export function GeneratorPanel() {
  const { expanded, reduceMotion } = useGenerator();
  const { shellRef, copyRef } = usePanelOpen(expanded, reduceMotion);

  return (
    <div
      ref={shellRef}
      className="theme-light panel-shell panel-shadow relative flex w-full items-start overflow-hidden rounded-panel p-5 sm:p-10"
      style={
        {
          "--panel-max": `${expanded ? PANEL_WIDTH.open : PANEL_WIDTH.closed}px`,
          "--panel-form-max": `${expanded ? PANEL_COLUMN.open : PANEL_COLUMN.closed}px`,
          "--panel-form-closed": `${PANEL_COLUMN.closed}px`,
          "--panel-card-width": panelCardWidth(),
          "--panel-open": `${PANEL_OPEN_MS}ms`,
        } as React.CSSProperties
      }
    >
      <div className="panel-form relative flex w-full shrink-0 flex-col gap-5">
        {/* The copy wraps differently once narrow. The closed wrap fades out over the open
            one, because text re-breaking mid-animation is the thing that looks cheap. */}
        {expanded ? (
          <div aria-hidden className="panel-copy-ghost absolute left-0 top-0 flex flex-col gap-5">
            <div className="site-panel-title">{COPY.hero.headline}</div>
            <p className="site-body text-ink-muted">{COPY.hero.intro}</p>
          </div>
        ) : null}
        <div ref={copyRef} className={`panel-copy flex flex-col gap-5 ${expanded ? "panel-copy-in" : ""}`}>
          <h1 className="site-panel-title">{COPY.hero.headline}</h1>
          <p className="site-body text-ink-muted">{COPY.hero.intro}</p>
        </div>
        <RepoField />
        <TryRow />
        <GeneratorStatus />

        {expanded ? (
          <div className="panel-reveal flex flex-col gap-3 border-t border-rule pt-5">
            <StyleControls />
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="panel-card panel-card-in flex shrink-0 flex-col gap-3">
          <PlateStatus />
          <GeneratorPlate />
          <GeneratorActions />
        </div>
      ) : null}
    </div>
  );
}
