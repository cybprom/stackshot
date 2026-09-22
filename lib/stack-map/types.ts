export type Category = "frontend" | "backend" | "infra" | "tooling";

// Signal id namespaces, "<ecosystem>:<name>". ADR-0015.
export const ECOSYSTEMS = ["npm", "pypi", "go", "cargo", "gem", "composer", "docker", "action", "tool"] as const;
export type Ecosystem = (typeof ECOSYSTEMS)[number];

export type MapEntry = {
  // Bare and kebab-case: "next", "postgres". Never namespaced.
  id: string;
  display: string;
  category: Category;
  // Rank within the layer. 90+ defines the project, 70s core, 50s notable, below 40 filler.
  weight: number;
  // One line, site only. ADR-0009.
  description: string;
  // Namespaced signal ids that resolve here. A trailing * matches a prefix.
  aliases: string[];
  // Entry ids this one makes redundant on the card.
  suppresses?: string[];
};

export type RawSignal = {
  // "<ecosystem>:<name>", e.g. "npm:next", "docker:postgres". ADR-0015.
  id: string;
  rawVersion?: string;
  source: string;
  // 2 = declared dependency, 1 = inferred from CI or Docker.
  confidence: 1 | 2;
};

export type StackItem = {
  id: string;
  display: string;
  // Major only. See ADR-0008.
  version?: string;
  // Site only — never rendered on the card. See ADR-0009.
  description: string;
};

export type StackLayer = {
  category: Category;
  // At most 6, per invariant I4.
  items: StackItem[];
  overflow: number;
};

export type StackDoc = {
  owner: string;
  repo: string;
  language: string | null;
  stars: number;
  // At most 4, empty categories omitted entirely.
  layers: StackLayer[];
  // The date this stack shape was first seen, not now — hashing "now" would
  // break render determinism (I2). Excluded from the hash input.
  asOf: string;
  // Logged, never rendered (I3).
  unmapped: string[];
};
