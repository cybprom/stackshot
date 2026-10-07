"use client";

import { useGenerator } from "@/app/site/generator/context";
import { Segmented } from "@/app/preview/segmented";
import { LAUNCH_STYLES, THEME_MODES } from "@/lib/preview";
import { COPY } from "@/lib/site";

/**
 * The style switcher and the theme toggle. A sits them above the plate and C beside it,
 * so they wrap rather than assuming a row, and the note that explains the toggle travels
 * with them.
 */
export function StyleControls() {
  const { style, pickStyle, mode, setMode } = useGenerator();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented
          label={COPY.styleGroup}
          options={LAUNCH_STYLES.map((name) => ({ value: name, label: COPY.style[name] }))}
          value={style}
          onChange={pickStyle}
        />
        <Segmented
          label={COPY.themeGroup}
          options={THEME_MODES.map((name) => ({ value: name, label: COPY.theme[name] }))}
          value={mode}
          onChange={setMode}
          describedBy="theme-note"
        />
      </div>

      {/* Beside the control it explains, not beneath the card: it is the one control on
          the page that changes nothing about what you copy. */}
      <p id="theme-note" className="site-label text-ink-muted">
        {COPY.themeNote}
      </p>
    </div>
  );
}
