"use client";

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * The style switcher and the theme toggle are the same control twice, so it is one
 * component. `aria-pressed` rather than a radio group: these act immediately on the
 * preview rather than being submitted, and the group is labelled for a screen reader.
 *
 * The groove and the 34-unit button height come from `docs/design/site/`, where A and C
 * agree; the padding and gap are on DESIGN's spacing scale, which the designs' 4 and 3
 * round to without a visible difference.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  describedBy,
}: {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** The note beneath, so a screen reader hears what the control does, not just its name. */
  describedBy?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className="flex gap-1 rounded-segment bg-track p-1"
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            className={`site-label motion-state h-8.5 rounded-segment-item px-3 ${pressed ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
