"use client";

import { useLayoutEffect, useRef } from "react";

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * The style switcher and the theme toggle are the same control twice. `aria-pressed`
 * rather than a radio group, because these act immediately. Only mounted once the panel
 * has opened, so the layout effect never runs on the server.
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
  describedBy?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  // Labels differ in width, so the selected fill is measured rather than computed.
  useLayoutEffect(() => {
    const group = groupRef.current;
    const fill = fillRef.current;
    if (!group || !fill) return;

    const place = () => {
      const pressed = group.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!pressed) return;
      fill.style.width = `${pressed.offsetWidth}px`;
      fill.style.transform = `translateX(${pressed.offsetLeft}px)`;
    };
    place();
    // Added a frame later, so the fill lands in place on mount instead of sliding in.
    const frame = requestAnimationFrame(() => fill.classList.add("segment-fill-live"));

    const observer = new ResizeObserver(place);
    observer.observe(group);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value]);

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const at = options.findIndex((option) => option.value === value);
    const next = (at + step + options.length) % options.length;
    const target = options[next];
    if (!target) return;
    onChange(target.value);
    groupRef.current?.querySelectorAll("button")[next]?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      className="relative flex rounded-segment border border-rule p-0.5"
    >
      <span ref={fillRef} aria-hidden className="segment-fill absolute inset-y-0.5 left-0 rounded-segment-item bg-ink" />
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            className={`site-control motion-state relative h-8 rounded-segment-item px-2.5 sm:px-3 ${pressed ? "text-surface" : "text-ink-muted hover:text-ink"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
