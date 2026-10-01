import type { ComponentType } from "react";
import { TerminalPreviewCard } from "@/app/preview/terminal-card";
import { TilesPreviewCard } from "@/app/preview/tiles-card";
import type { LaunchStyle, PreviewDoc } from "@/lib/preview";
import type { Theme } from "@/lib/tokens";

export type PreviewCardProps = { doc: PreviewDoc; theme: Theme };

/**
 * Exhaustive by construction, the way `CARD_STYLE_DEFS` is for the renderer: adding a name
 * to `LAUNCH_STYLES` is a type error here until it has an HTML preview. A launch style
 * without one would make the switcher request a PNG per press.
 */
export const PREVIEW_CARDS: Record<LaunchStyle, ComponentType<PreviewCardProps>> = {
  tiles: TilesPreviewCard,
  terminal: TerminalPreviewCard,
};
