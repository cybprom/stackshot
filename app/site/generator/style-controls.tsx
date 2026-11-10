"use client";

import { useGenerator } from "@/app/site/generator/context";
import { Segmented } from "@/app/preview/segmented";
import { LAUNCH_STYLES, THEME_MODES } from "@/lib/preview";
import { COPY } from "@/lib/site";

/** The style switcher and the theme toggle, with the note that explains the toggle. */
export function StyleControls() {
  const { style, pickStyle, mode, setMode } = useGenerator();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <p id="theme-note" className="site-small hidden text-[14px] text-ink-muted sm:block">
        {COPY.themeNote}
      </p>
    </div>
  );
}
