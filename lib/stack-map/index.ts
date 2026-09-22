import type { MapEntry } from "@/lib/stack-map/types";
import { DENY } from "@/lib/stack-map/deny";
import { BACKEND } from "@/lib/stack-map/entries/backend";
import { FRONTEND } from "@/lib/stack-map/entries/frontend";
import { INFRA } from "@/lib/stack-map/entries/infra";
import { TOOLING } from "@/lib/stack-map/entries/tooling";

export const STACK_MAP: readonly MapEntry[] = [...FRONTEND, ...BACKEND, ...INFRA, ...TOOLING];
export { DENY };

const byId = new Map(STACK_MAP.map((e) => [e.id, e]));
const exact = new Map<string, MapEntry>();
const prefixes: [string, MapEntry][] = [];
for (const entry of STACK_MAP) {
  for (const alias of entry.aliases) {
    if (alias.endsWith("*")) prefixes.push([alias.slice(0, -1), entry]);
    else exact.set(alias, entry);
  }
}
// Longest prefix wins, so a specific glob beats a broad one.
prefixes.sort((a, b) => b[0].length - a[0].length);

const denyPatterns = DENY.map(globToRegExp);

/** Whether a signal id matches an alias pattern: exact, or a trailing-* prefix. */
export function matchesAlias(signalId: string, pattern: string): boolean {
  return pattern.endsWith("*") ? signalId.startsWith(pattern.slice(0, -1)) : signalId === pattern;
}

/** The map entry a namespaced signal id resolves to: exact alias first, then prefix. */
export function lookup(signalId: string): MapEntry | undefined {
  return exact.get(signalId) ?? prefixes.find(([prefix]) => signalId.startsWith(prefix))?.[1];
}

export function entryById(id: string): MapEntry | undefined {
  return byId.get(id);
}

export function isDenied(signalId: string): boolean {
  return denyPatterns.some((pattern) => pattern.test(signalId));
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}
