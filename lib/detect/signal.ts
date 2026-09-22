import type { RawSignal } from "@/lib/stack-map/types";

// Ids are namespaced so one name in two ecosystems stays two signals. ADR-0015.
export type Ecosystem = "npm" | "pypi" | "go" | "cargo" | "gem" | "composer" | "docker" | "action" | "tool";

export function signal(
  ecosystem: Ecosystem,
  name: string,
  source: string,
  confidence: 1 | 2,
  rawVersion?: string,
): RawSignal {
  const id = `${ecosystem}:${name}`;
  return rawVersion ? { id, rawVersion, source, confidence } : { id, source, confidence };
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}
