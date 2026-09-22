import { z } from "zod";
import type { RawSignal, Scope } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";

const DepsSchema = z.record(z.string(), z.unknown()).optional().catch(undefined);

const PackageJsonSchema = z.object({
  dependencies: DepsSchema,
  devDependencies: DepsSchema,
  engines: z.object({ node: z.string().optional() }).optional().catch(undefined),
  packageManager: z.string().optional().catch(undefined),
});

// The repo's own packages, not dependencies of it.
const LOCAL_PROTOCOL = /^(workspace|file|link|portal):/;

/** dependencies and devDependencies; peers are what a library works with, not uses. */
export function detectPackageJson(contents: string, path: string): RawSignal[] {
  const parsed = PackageJsonSchema.safeParse(parseJson(contents));
  if (!parsed.success) return [];
  const pkg = parsed.data;

  // A name in both sections is a runtime dependency, with the runtime range.
  const declared = new Map<string, [unknown, Scope]>();
  for (const [name, range] of Object.entries(pkg.devDependencies ?? {})) declared.set(name, [range, "dev"]);
  for (const [name, range] of Object.entries(pkg.dependencies ?? {})) declared.set(name, [range, "runtime"]);

  const deps = [...declared].flatMap(([name, [range, scope]]) => {
    if (typeof range !== "string") return [signal("npm", name, path, 2, scope)];
    if (LOCAL_PROTOCOL.test(range)) return [];
    return [signal("npm", name, path, 2, scope, range)];
  });

  const tools: RawSignal[] = [];
  if (pkg.engines?.node) tools.push(signal("tool", "node", path, 2, "runtime", pkg.engines.node));
  const manager = pkg.packageManager?.match(/^([a-z]+)@([^+]+)/);
  if (manager?.[1]) tools.push(signal("tool", manager[1], path, 2, "dev", manager[2]));

  return [...deps, ...tools];
}

function parseJson(contents: string): unknown {
  try {
    return JSON.parse(contents);
  } catch {
    return null;
  }
}
