import { createHash } from "node:crypto";
import type { StackDoc } from "@/lib/stack-map/types";

/**
 * Key-sorted JSON. `JSON.stringify` preserves insertion order, so two equal docs built by
 * different code paths would otherwise hash differently. ADR-0005.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** The render cache key: a repo whose stack has not changed re-uses its PNGs. ADR-0005. */
export function stackHash(doc: StackDoc): string {
  return createHash("sha256").update(stableStringify(doc)).digest("hex").slice(0, 32);
}
