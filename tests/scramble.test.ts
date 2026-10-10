import { describe, expect, it } from "vitest";
import {
  SCRAMBLE_CHARS,
  SCRAMBLE_CYCLES,
  SCRAMBLE_STEP_MS,
  scrambleDuration,
  scrambleFrame,
  scrambleTicks,
} from "@/lib/scramble";
import { COPY } from "@/lib/site";

// Deterministic, so a frame is a fact rather than a sample.
const first = () => 0;

describe("the button's label resolving", () => {
  const target = "Drawing card";

  it("never changes the string's length", () => {
    for (let tick = 0; tick <= scrambleTicks(target); tick += 1) {
      expect(scrambleFrame(target, tick, first)).toHaveLength(target.length);
    }
  });

  /** The word shape is what makes this read as a label turning over, not as noise. */
  it("never scrambles a space", () => {
    expect(scrambleFrame(target, 0, first)[7]).toBe(" ");
  });

  it("is fully scrambled at the first tick", () => {
    const frame = scrambleFrame(target, 0, first);
    expect(frame).toBe("!!!!!!! !!!!");
    expect(frame).not.toBe(target);
  });

  it("resolves left to right", () => {
    expect(scrambleFrame(target, SCRAMBLE_CYCLES * 3, first)).toBe(`Dra${"!".repeat(4)} !!!!`);
  });

  it("is the target by its last tick, and stays there", () => {
    expect(scrambleFrame(target, scrambleTicks(target), first)).toBe(target);
    expect(scrambleFrame(target, scrambleTicks(target) + 50, first)).toBe(target);
  });

  /** A letter in the set would let a frame read as a different word for an instant. */
  it("scrambles with punctuation only", () => {
    expect(SCRAMBLE_CHARS).not.toMatch(/[a-z0-9]/i);
  });

  /**
   * The two phases it runs between are the ones a resolve passes through, and the label
   * has to have settled before the next change arrives or the button never reads as
   * anything. A resolve's own phases are seconds; this is well under one.
   */
  it("settles well inside a phase", () => {
    for (const label of [COPY.generate, COPY.reading, COPY.drawing]) {
      expect(scrambleDuration(label)).toBeLessThan(1000);
    }
    expect(SCRAMBLE_STEP_MS).toBeGreaterThan(16);
  });
});
