"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SCRAMBLE_CYCLES, SCRAMBLE_STEP_MS, scrambleFrame, scrambleTicks } from "@/lib/scramble";

/**
 * A label that resolves into place — on hover or focus, and whenever the label itself
 * changes, so "Reading repo" turning into "Drawing card" is the same gesture as pointing
 * at the button.
 *
 * Four things the sketch this came from did not do, each a real failure here rather than
 * a nicety:
 *
 * - **One run at a time.** Hovering during a phase change started a second interval over
 *   the first, and only the second was ever cleared — the first went on setting state at
 *   28ms for the life of the page.
 * - **Cleared on unmount.** C unmounts this button's column when the panel closes.
 * - **Keyboard too.** Hover-only motion is a thing a keyboard user is told about and
 *   cannot see. Focus starts it, blur ends it.
 * - **The accessible name never scrambles.** The caller keeps the real label in
 *   `aria-label` and hides the scrambling text from assistive technology, or a screen
 *   reader reads punctuation and the live region announces it. That is the contract.
 *
 * Under reduced motion it returns the label and starts nothing: this is decoration on a
 * control whose text is the thing that matters.
 */
export function useScramble(
  label: string,
  reduceMotion: boolean,
  cycles: number = SCRAMBLE_CYCLES,
): { text: string; start: () => void; stop: () => void } {
  const [text, setText] = useState(label);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Read inside the interval rather than closed over, so a run already going when the
  // label changes resolves into the label it is actually settling on.
  const target = useRef(label);
  // The label this last ran for — not a "have we mounted" flag. Strict Mode re-invokes
  // the effect with the same label, and a mount flag lets that second invocation scramble
  // a button nobody has touched. Comparing the label itself is also what the effect
  // actually means.
  const previous = useRef(label);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    let tick = 0;
    timer.current = setInterval(() => {
      tick += 1;
      const current = target.current;
      if (tick >= scrambleTicks(current, cycles)) {
        clear();
        setText(current);
        return;
      }
      setText(scrambleFrame(current, tick, Math.random, cycles));
    }, SCRAMBLE_STEP_MS);
  }, [clear, cycles]);

  const stop = useCallback(() => {
    clear();
    setText(target.current);
  }, [clear]);

  // The label changed under us — a new phase. Run it unasked, because the change is the
  // thing worth showing. Not on the first render: the page arrives complete.
  useEffect(() => {
    target.current = label;
    if (previous.current === label) return;
    previous.current = label;
    if (reduceMotion) return;
    start();
    return clear;
  }, [label, reduceMotion, start, clear]);

  useEffect(() => clear, [clear]);

  return { text: reduceMotion ? label : text, start, stop };
}
