import type { RawSignal, Scope } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";
import { selectablePackageJsonCount } from "@/lib/manifest-paths";

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

// A platform's config file says the project deploys there, whatever its CLI is declared
// as. These are inferred signals, so ADR-0023 can never drop the platform for having only
// `wrangler` in devDependencies. Supabase keeps its config in a fixed subdirectory.
const PLATFORM_CONFIG: Record<string, string> = {
  "wrangler.toml": "cloudflare",
  "wrangler.jsonc": "cloudflare",
  "wrangler.json": "cloudflare",
  "vercel.json": "vercel",
  "netlify.toml": "netlify",
  "firebase.json": "firebase",
  "supabase/config.toml": "supabase",
};

// pnpm 10 moved settings out of .npmrc into pnpm-workspace.yaml, so a single-package repo
// now ships one too and its presence stopped meaning "monorepo". Counted rather than
// opened, and counted the way selection filters, or examples/*/package.json revives the
// same false positive. turbo.json, nx.json and lerna.json have no such second job.
// GOTCHAS 044.
const NEEDS_MULTIPLE_PACKAGES = new Set(["pnpm-workspace.yaml"]);

/** Tooling and platform signals from which files exist. The detector that takes paths. */
export function detectPaths(paths: string[]): RawSignal[] {
  const packages = selectablePackageJsonCount(paths);

  return paths.flatMap((path) => {
    const platform = PLATFORM_CONFIG[path];
    if (platform) return [signal("tool", platform, path, 1, "runtime")];
    const tool = path.includes("/") ? undefined : ROOT_FILES[path];
    if (!tool) return [];
    if (NEEDS_MULTIPLE_PACKAGES.has(path) && packages < 2) return [];
    return [signal("tool", tool[0], path, 1, tool[1])];
  });
}
