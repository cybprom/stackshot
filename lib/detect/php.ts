import { z } from "zod";
import type { RawSignal, Scope } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";

const Requires = z.record(z.string(), z.unknown()).optional().catch(undefined);
const ComposerSchema = z.object({ require: Requires, "require-dev": Requires });

// Platform packages: PHP extensions and Composer internals, not dependencies.
const PLATFORM = /^(ext-|lib-|composer-|php-)/;

/** composer.json require and require-dev; the `php` key is the runtime. */
export function detectPhp(contents: string, path: string): RawSignal[] {
  const parsed = ComposerSchema.safeParse(parseJson(contents));
  if (!parsed.success) return [];

  // A package in both sections is a runtime dependency, with the runtime range.
  const declared = new Map<string, [unknown, Scope]>();
  for (const [name, range] of Object.entries(parsed.data["require-dev"] ?? {})) declared.set(name, [range, "dev"]);
  for (const [name, range] of Object.entries(parsed.data.require ?? {})) declared.set(name, [range, "runtime"]);

  return [...declared].flatMap(([name, [range, scope]]) => {
    const version = typeof range === "string" ? range : undefined;
    if (name === "php") return [signal("tool", "php", path, 2, "runtime", version)];
    if (PLATFORM.test(name) || !name.includes("/")) return [];
    return [signal("composer", name.toLowerCase(), path, 2, scope, version)];
  });
}

function parseJson(contents: string): unknown {
  try {
    return JSON.parse(contents);
  } catch {
    return null;
  }
}
