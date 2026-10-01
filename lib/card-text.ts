import type { Category } from "@/lib/stack-map/types";

/**
 * The strings every card style says, render-free so the site's HTML preview can say them
 * identically. A second copy of any of these drifts in silence: the preview goes on
 * looking right while no longer matching the PNG it crossfades into. ADR-0032.
 */

/**
 * A literal rather than `SITE_ORIGIN`: `lib/render` must not read an environment variable,
 * or one doc would render different bytes in two deployments (I2). Every style shows this
 * line in `TYPE.meta`; where it sits is the frame's business.
 */
export const DOMAIN = "stackshot.ilerioluwa.com";

/** So every style, and the preview, round a star count the same way. */
export function starsLabel(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k stars`;
  return `${n} stars`;
}

/**
 * Capitalised, not all-caps: the Datasheet's gutter is the project's only all-caps, and
 * these name a key to a diagram rather than signage on one. Tiles' legend, the site's
 * description list and the Tiles preview are all this one map.
 */
export const LAYER_NAME: Record<Category, string> = {
  frontend: "Frontend",
  backend: "Backend",
  infra: "Infra",
  tooling: "Tooling",
};
