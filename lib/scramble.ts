/**
 * The button's text resolving character by character, as a pure function of a tick.
 *
 * Render-free and testable, like every other piece of the site's motion arithmetic
 * (`lib/preview.ts`). The component owns the interval and the accessibility; this owns
 * what the string looks like at step N.
 */

/** Punctuation only, and none of it a letter: a scrambled word must not read as a word. */
export const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#$%&";

/** One step. Short enough that the whole run reads as a transition, not a loading state. */
export const SCRAMBLE_STEP_MS = 28;

/** Steps each character stays scrambled before it settles. */
export const SCRAMBLE_CYCLES = 2;

/**
 * The string at step `tick`. Characters resolve left to right; **spaces never scramble**,
 * so the word shape holds and the eye reads one label turning into another rather than a
 * block of noise.
 *
 * `random` is injected so the test is deterministic — not because anything else needs it.
 */
export function scrambleFrame(target: string, tick: number, random: () => number = Math.random): string {
  return target
    .split("")
    .map((char, index) => {
      if (tick / SCRAMBLE_CYCLES > index || char === " ") return char;
      return SCRAMBLE_CHARS[Math.floor(random() * SCRAMBLE_CHARS.length)] ?? char;
    })
    .join("");
}

/** The first tick at which `scrambleFrame` returns the target unchanged. */
export function scrambleTicks(target: string): number {
  return target.length * SCRAMBLE_CYCLES;
}

/** How long a label takes to resolve, for anything that has to wait for it. */
export function scrambleDuration(target: string): number {
  return scrambleTicks(target) * SCRAMBLE_STEP_MS;
}
