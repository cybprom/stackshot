import type { Category, MapEntry, RawSignal, StackContent, StackItem, StackLayer } from "@/lib/stack-map/types";
import { isDenied, lookup, matchesAlias } from "@/lib/stack-map";
import { mergeVersions } from "@/lib/version";

export type RepoMeta = Pick<StackContent, "owner" | "repo" | "language" | "stars">;

// I4.
export const MAX_ITEMS_PER_LAYER = 6;
const LAYER_ORDER: Category[] = ["frontend", "backend", "infra", "tooling"];

type Candidate = { entry: MapEntry; signals: RawSignal[] };

// itemsPerLayer lets the step-5 harness see what overflow hides.
export type NormalizeOptions = { itemsPerLayer?: number };

/** RawSignal[] → StackContent: deny, map, suppress, version, rank, slice. */
export function normalize(signals: RawSignal[], meta: RepoMeta, options: NormalizeOptions = {}): StackContent {
  const unmapped = new Set<string>();
  const byEntry = new Map<string, Candidate>();

  for (const signal of signals) {
    if (isDenied(signal.id)) continue;
    const entry = lookup(signal.id);
    if (!entry) {
      unmapped.add(signal.id);
      continue;
    }
    // A library testing against pg doesn't run PostgreSQL.
    if (entry.runtimeOnly && signal.scope === "dev") continue;
    const candidate = byEntry.get(entry.id) ?? { entry, signals: [] };
    candidate.signals.push(signal);
    byEntry.set(entry.id, candidate);
  }

  // Suppression reads the set as it stood, so a chain can't depend on iteration order.
  const suppressed = new Set([...byEntry.values()].flatMap((c) => c.entry.suppresses ?? []));
  const survivors = [...byEntry.values()].filter((c) => !suppressed.has(c.entry.id));

  // A repo that declares no runtime dependency anywhere is a library, and its dev
  // dependencies are all it has. One that has them and still shows dev-only entries in a
  // layer is showing its tooling. ADR-0021.
  const shipsSomething = signals.some(isRuntimeDependency);

  const layers = LAYER_ORDER.flatMap((category): StackLayer[] => {
    const inLayer = survivors.filter((c) => c.entry.category === category);
    const kept =
      shipsSomething && category !== "tooling" ? inLayer.filter((c) => !manifestDevOnly(c)) : inLayer;
    const ranked = kept.sort(byRank);
    if (ranked.length === 0) return [];
    return [
      {
        category,
        items: ranked.slice(0, options.itemsPerLayer ?? MAX_ITEMS_PER_LAYER).map(toItem),
        overflow: Math.max(0, ranked.length - (options.itemsPerLayer ?? MAX_ITEMS_PER_LAYER)),
      },
    ];
  });

  return { ...meta, layers, unmapped: [...unmapped].sort() };
}

// Runtime-backed first (except in tooling, where dev scope is the norm), then weight,
// then the strongest signal's confidence, then id for a stable order.
function byRank(a: Candidate, b: Candidate): number {
  return (
    Number(shipped(b)) - Number(shipped(a)) ||
    b.entry.weight - a.entry.weight ||
    confidence(b) - confidence(a) ||
    (a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0)
  );
}

function shipped(c: Candidate): boolean {
  return c.entry.category === "tooling" || c.signals.some((s) => s.scope === "runtime");
}

// Declared only as a manifest devDependency. CI and Docker signals are exempt, as
// tooling is: GitHub Actions is dev-scoped infra and belongs on the card.
function manifestDevOnly(c: Candidate): boolean {
  return c.signals.every((s) => s.scope === "dev" && s.confidence === 2);
}

// A declared dependency that ships. `engines.node` is a declaration about the host, not a
// dependency, so a library that only declares it still counts as shipping nothing.
function isRuntimeDependency(signal: RawSignal): boolean {
  return signal.scope === "runtime" && signal.confidence === 2 && !signal.id.startsWith("tool:");
}

function confidence(c: Candidate): number {
  return Math.max(...c.signals.map((s) => s.confidence));
}

function toItem({ entry, signals }: Candidate): StackItem {
  const { versionFrom } = entry;
  const versioned = versionFrom ? signals.filter((s) => versionFrom.some((p) => matchesAlias(s.id, p))) : signals;
  const version = mergeVersions(
    versioned.map((s) => s.rawVersion),
    entry.versionPrecision ?? "major",
  );
  const base = { id: entry.id, display: entry.display, description: entry.description };
  // No undefined keys: the doc is hashed, and the hash must not see absent-vs-undefined.
  return version ? { ...base, version } : base;
}
