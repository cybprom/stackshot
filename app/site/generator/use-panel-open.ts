"use client";

import { useLayoutEffect, useRef } from "react";
import { PANEL_OPEN_MS } from "@/lib/hero";

const heights = (from: number, to: number) => [{ height: `${from}px` }, { height: `${to}px` }];
const lift = (distance: number) => [{ transform: `translateY(${distance}px)` }, { transform: "none" }];

/**
 * Eases the panel and its copy block from their closed heights to whatever the open layout
 * measures, on the curve the width already uses. CSS cannot transition to `auto`. The
 * animation holds no state, so when it ends both elements are plain auto-height again.
 */
export function usePanelOpen(expanded: boolean, reduceMotion: boolean) {
  const shellRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const closed = useRef({ shell: 0, copy: 0 });

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const copy = copyRef.current;
    if (!shell || !copy) return;

    if (!expanded) {
      const observer = new ResizeObserver(() => {
        closed.current = { shell: shell.offsetHeight, copy: copy.offsetHeight };
      });
      observer.observe(shell);
      return () => observer.disconnect();
    }

    const from = closed.current;
    // Zeroed below, so a later reduced-motion toggle cannot replay the opening.
    if (reduceMotion || from.shell === 0) return;
    closed.current = { shell: 0, copy: 0 };

    const options = { duration: PANEL_OPEN_MS, easing: getComputedStyle(shell).getPropertyValue("--ease-standard") };
    const shellRun = shell.animate(heights(from.shell, shell.offsetHeight), options);
    const copyRun = copy.animate(heights(from.copy, copy.offsetHeight), options);

    // The caption sits below the panel in flow. The same distance on the same curve,
    // inverted, cancels the panel's growth exactly, so it is already where it will end.
    const caption = shell.parentElement?.querySelector(".wall-caption");
    const captionRun = caption?.animate(lift(shell.offsetHeight - from.shell), options);

    // The example card's image can land mid-opening and change where the panel ends.
    const retarget = new ResizeObserver(() => {
      if (shellRun.effect instanceof KeyframeEffect) {
        shellRun.effect.setKeyframes(heights(from.shell, shell.scrollHeight));
      }
      if (captionRun?.effect instanceof KeyframeEffect) {
        captionRun.effect.setKeyframes(lift(shell.scrollHeight - from.shell));
      }
    });
    for (const child of Array.from(shell.children)) retarget.observe(child);
    const stop = () => retarget.disconnect();
    shellRun.finished.then(stop, stop);

    return () => {
      stop();
      shellRun.cancel();
      copyRun.cancel();
      captionRun?.cancel();
    };
  }, [expanded, reduceMotion]);

  return { shellRef, copyRef };
}
