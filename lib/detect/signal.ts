import type { Ecosystem, RawSignal, Scope } from "@/lib/stack-map/types";

// Ids are namespaced so one name in two ecosystems stays two signals. ADR-0015.
export function signal(
  ecosystem: Ecosystem,
  name: string,
  source: string,
  confidence: 1 | 2,
  scope: Scope,
  rawVersion?: string,
): RawSignal {
  const id = `${ecosystem}:${name}`;
  return rawVersion ? { id, rawVersion, source, confidence, scope } : { id, source, confidence, scope };
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}
