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
  // Aliases whose versions are this entry's own; omitted means all. psycopg 3 isn't
  // PostgreSQL 3, and a hosted service has no version at all ([]). ADR-0017.
  versionFrom?: string[];
  // Omitted means "major". Go 1 and Python 3 say nothing, so those show minor. ADR-0017.
  versionPrecision?: "major" | "minor";
  // Dev-scope signals don't count at all: a library testing against pg doesn't run
  // PostgreSQL. Databases and brokers, whose drivers imply them.
  runtimeOnly?: boolean;
  // Normally a runtime dependency, so a dev-only declaration means a test fixture and the
  // entry is dropped. Default is to keep: an incomplete list then shows noise rather than
  // losing a real layer. ADR-0023.
  dropWhenDevOnly?: boolean;
};

// "runtime": part of what ships or runs. "dev": declared only for development, test or CI.
export type Scope = "runtime" | "dev";

export type RawSignal = {
  // "<ecosystem>:<name>", e.g. "npm:next", "docker:postgres". ADR-0015.
  id: string;
  rawVersion?: string;
  source: string;
  // 2 = declared dependency, 1 = inferred from CI or Docker.
  confidence: 1 | 2;
  scope: Scope;
};

export type StackItem = {
  id: string;
  display: string;
  // Major, or major.minor where the entry says so. ADR-0008, ADR-0017.
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
  // Logged, never rendered (I3).
  unmapped: string[];
};
