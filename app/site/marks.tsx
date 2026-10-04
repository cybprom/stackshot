import { LAYER_NAME } from "@/lib/card-text";
import type { Category } from "@/lib/stack-map/types";

const CATEGORIES = Object.keys(LAYER_NAME) as Category[];

/**
 * The logo: four squares in the four layer colours, which is the card's own encoding at
 * 16 units. Not a glyph and not a wordmark — the thing a Stackshot card is, shrunk.
 *
 * Decorative beside the wordmark it always sits with, so it is hidden from assistive
 * technology rather than described twice.
 */
export function LogoMark({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 grid-cols-2 gap-[2px]"
      style={{ width: size, height: size }}
    >
      {CATEGORIES.map((category) => (
        <span key={category} className="rounded-[2px]" style={{ backgroundColor: `var(--layer-${category})` }} />
      ))}
    </span>
  );
}

export function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
    </svg>
  );
}
