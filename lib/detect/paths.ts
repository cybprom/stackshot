import type { RawSignal } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";

// Presence only; no lockfile is ever opened. Root only: next.js's examples/ hold yarn,
// npm and bun lockfiles that say nothing about what the project itself uses.
const ROOT_FILES: Record<string, string> = {
  "pnpm-workspace.yaml": "pnpm-workspace",
  "turbo.json": "turborepo",
  "nx.json": "nx",
  "lerna.json": "lerna",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "poetry.lock": "poetry",
  "uv.lock": "uv",
};

/** Tooling signals from which root files exist. The one detector that takes paths. */
export function detectPaths(paths: string[]): RawSignal[] {
  return paths.flatMap((path) => {
    const tool = path.includes("/") ? undefined : ROOT_FILES[path];
    return tool ? [signal("tool", tool, path, 1)] : [];
  });
}
