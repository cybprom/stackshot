export type Theme = "light" | "dark";

export const COLORS: Record<Theme, Record<string, string>> = {
  light: {
    surface: "#EDEEEA",
    ink: "#101615",
    inkMuted: "#5A625E",
    // Decorative hairlines only — fails 3:1 against surface. See DESIGN.md COLOR.
    rule: "#C8CCC4",
    accent: "#C8461E",
  },
  dark: {
    surface: "#0E1113",
    ink: "#DDE2DD",
    inkMuted: "#8B9490",
    rule: "#242A2B",
    accent: "#FF6B3D",
  },
};

export const SPACE = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const CARD = {
  width: 1200,
  // 800, not 750 — the rule-weight floor pushed the vertical budget over. GOTCHAS 012.
  height: 800,
  padding: 32,
  // Off-scale by necessity: derived from the rotated label's cap height.
  gutter: 72,
  border: 3,
  accentBar: 4,
  headerBand: 140,
  footer: 56,
  bandMinHeight: 120,
  // Decreasing downward, floor of 3. Hierarchy comes from weight, not color.
  separators: [8, 5, 3, 3],
  radius: 2,
} as const;

// Commit Mono ships 400 and 700 only, and the scale is built on that. GOTCHAS 014.
export const TYPE = {
  display: { size: 64, family: "Archivo", weight: 600, lineHeight: 1.0, tracking: -0.02 },
  owner: { size: 24, family: "Commit Mono", weight: 400, lineHeight: 1.2, tracking: 0 },
  item: { size: 30, family: "Commit Mono", weight: 400, lineHeight: 1.1, tracking: -0.01 },
  version: { size: 22, family: "Commit Mono", weight: 400, lineHeight: 1.1, tracking: 0 },
  overflow: { size: 22, family: "Commit Mono", weight: 400, lineHeight: 1.1, tracking: 0.02 },
  gutter: { size: 18, family: "Commit Mono", weight: 700, lineHeight: 1.0, tracking: 0.18 },
  meta: { size: 16, family: "Commit Mono", weight: 400, lineHeight: 1.2, tracking: 0.04 },
} as const;

// Steps down past ~22 and ~30 characters. Never truncates.
export function displaySize(repo: string): number {
  if (repo.length > 30) return 40;
  if (repo.length > 22) return 48;
  return TYPE.display.size;
}
