import type { RawSignal } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";

const GEM = /^\s*gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/;
const RUBY = /^\s*ruby\s+["']([^"']+)["']/;

/** Gemfile `gem` lines and the `ruby` directive, by regex. Gemfiles are Ruby code. */
export function detectRuby(contents: string, path: string): RawSignal[] {
  return contents.split("\n").flatMap((line) => {
    const gem = line.match(GEM);
    if (gem?.[1]) return [signal("gem", gem[1], path, 2, gem[2])];
    const ruby = line.match(RUBY);
    if (ruby?.[1]) return [signal("tool", "ruby", path, 2, ruby[1])];
    return [];
  });
}
