import type { RawSignal, Scope } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";

// Presence only, never opened, root only: next.js's examples/ hold lockfiles that say
// nothing about the project. Lockfiles are dev tooling; deno.json declares the runtime.
const ROOT_FILES: Record<string, [string, Scope]> = {
  "pnpm-workspace.yaml": ["pnpm-workspace", "dev"],
  "turbo.json": ["turborepo", "dev"],
  "nx.json": ["nx", "dev"],
  "lerna.json": ["lerna", "dev"],
  "pnpm-lock.yaml": ["pnpm", "dev"],
  "yarn.lock": ["yarn", "dev"],
  "package-lock.json": ["npm", "dev"],
  "bun.lock": ["bun", "dev"],
  "bun.lockb": ["bun", "dev"],
  "poetry.lock": ["poetry", "dev"],
  "uv.lock": ["uv", "dev"],
  "deno.json": ["deno", "runtime"],
  "deno.jsonc": ["deno", "runtime"],
};

/** Tooling signals from which root files exist. The one detector that takes paths. */
export function detectPaths(paths: string[]): RawSignal[] {
  return paths.flatMap((path) => {
    const tool = path.includes("/") ? undefined : ROOT_FILES[path];
    return tool ? [signal("tool", tool[0], path, 1, tool[1])] : [];
  });
}
