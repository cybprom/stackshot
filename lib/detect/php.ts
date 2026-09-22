import { z } from "zod";
import type { RawSignal } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";

const Requires = z.record(z.string(), z.unknown()).optional().catch(undefined);
const ComposerSchema = z.object({ require: Requires, "require-dev": Requires });

// Platform packages: PHP extensions and Composer internals, not dependencies.
const PLATFORM = /^(ext-|lib-|composer-|php-)/;

/** composer.json require and require-dev; the `php` key is the runtime. */
export function detectPhp(contents: string, path: string): RawSignal[] {
  const parsed = ComposerSchema.safeParse(parseJson(contents));
  if (!parsed.success) return [];

  return Object.entries({ ...parsed.data["require-dev"], ...parsed.data.require }).flatMap(([name, range]) => {
    const version = typeof range === "string" ? range : undefined;
    if (name === "php") return [signal("tool", "php", path, 2, version)];
    if (PLATFORM.test(name) || !name.includes("/")) return [];
    return [signal("composer", name.toLowerCase(), path, 2, version)];
  });
}

function parseJson(contents: string): unknown {
  try {
    return JSON.parse(contents);
  } catch {
    return null;
  }
}
