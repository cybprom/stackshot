import { parse } from "smol-toml";
import { z } from "zod";
import type { RawSignal, Scope } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";

const DepTable = z.record(z.string(), z.unknown()).optional().catch(undefined);

const DepSections = z.object({
  dependencies: DepTable,
  "dev-dependencies": DepTable,
  "build-dependencies": DepTable,
});

const CargoSchema = DepSections.extend({
  package: z.object({ "rust-version": z.unknown() }).partial().optional().catch(undefined),
  workspace: z
    .object({
      dependencies: DepTable,
      package: z.object({ "rust-version": z.unknown() }).partial().optional().catch(undefined),
    })
    .optional()
    .catch(undefined),
  target: z.record(z.string(), DepSections.catch({})).optional().catch(undefined),
});

type DepTableValue = z.infer<typeof DepTable>;

const DepSpec = z.object({
  version: z.string().optional(),
  path: z.string().optional(),
  package: z.string().optional(),
});

/** Cargo.toml dependency tables, including workspace and target-specific ones. */
export function detectRust(contents: string, path: string): RawSignal[] {
  const parsed = CargoSchema.safeParse(parseToml(contents));
  if (!parsed.success) return [];
  const cargo = parsed.data;

  const sections = (t: z.infer<typeof DepSections>): [DepTableValue, Scope][] => [
    [t.dependencies, "runtime"],
    [t["dev-dependencies"], "dev"],
    [t["build-dependencies"], "dev"],
  ];
  const tables: [DepTableValue, Scope][] = [
    ...sections(cargo),
    // Shared by members for every section, so its real scope is unknowable here.
    [cargo.workspace?.dependencies, "runtime"],
    ...Object.values(cargo.target ?? {}).flatMap(sections),
  ];

  const deps = tables.flatMap(([table, scope]) =>
    Object.entries(table ?? {}).flatMap(([key, spec]) => {
      if (typeof spec === "string") return [signal("cargo", key, path, 2, scope, spec)];
      const detail = DepSpec.safeParse(spec);
      if (!detail.success) return [signal("cargo", key, path, 2, scope)];
      // A path dependency is one of the repo's own crates.
      if (detail.data.path) return [];
      return [signal("cargo", detail.data.package ?? key, path, 2, scope, detail.data.version)];
    }),
  );

  const rustVersion = cargo.package?.["rust-version"] ?? cargo.workspace?.package?.["rust-version"];
  const rust = signal("tool", "rust", path, 2, "runtime", typeof rustVersion === "string" ? rustVersion : undefined);
  return [...deps, rust];
}

function parseToml(contents: string): unknown {
  try {
    return parse(contents);
  } catch {
    return null;
  }
}
