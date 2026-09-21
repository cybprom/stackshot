export type Category = "frontend" | "backend" | "infra" | "tooling";

export type RawSignal = {
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
