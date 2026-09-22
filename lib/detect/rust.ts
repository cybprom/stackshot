import { parse } from "smol-toml";
import { z } from "zod";
import type { RawSignal } from "@/lib/stack-map/types";
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

  const tables = [
    cargo.dependencies,
    cargo["dev-dependencies"],
    cargo["build-dependencies"],
    cargo.workspace?.dependencies,
    ...Object.values(cargo.target ?? {}).flatMap((t) => [
      t.dependencies,
      t["dev-dependencies"],
      t["build-dependencies"],
    ]),
  ];

  const deps = tables.flatMap((table) =>
    Object.entries(table ?? {}).flatMap(([key, spec]) => {
      if (typeof spec === "string") return [signal("cargo", key, path, 2, spec)];
      const detail = DepSpec.safeParse(spec);
      if (!detail.success) return [signal("cargo", key, path, 2)];
      // A path dependency is one of the repo's own crates.
      if (detail.data.path) return [];
      return [signal("cargo", detail.data.package ?? key, path, 2, detail.data.version)];
    }),
  );

  const rustVersion = cargo.package?.["rust-version"] ?? cargo.workspace?.package?.["rust-version"];
  const rust = signal("tool", "rust", path, 2, typeof rustVersion === "string" ? rustVersion : undefined);
  return [...deps, rust];
}

function parseToml(contents: string): unknown {
  try {
    return parse(contents);
  } catch {
    return null;
  }
}
