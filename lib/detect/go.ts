import type { RawSignal } from "@/lib/stack-map/types";
import { signal } from "@/lib/detect/signal";

const REQUIRE_LINE = /^([^\s()]+)\s+(v\S+)/;

// go.mod doesn't separate test dependencies, so everything is runtime scope.
/** go.mod require lines and the go directive. `// indirect` is transitive, so skipped. */
export function detectGo(contents: string, path: string): RawSignal[] {
  const signals: RawSignal[] = [];
  let inRequireBlock = false;

  for (const raw of contents.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("require (")) {
      inRequireBlock = true;
      continue;
    }
    if (inRequireBlock && line.startsWith(")")) {
      inRequireBlock = false;
      continue;
    }

    const directive = line.match(/^go\s+(\d\S*)/);
    if (directive?.[1]) {
      signals.push(signal("tool", "go", path, 2, "runtime", directive[1]));
      continue;
    }

    const body = inRequireBlock ? line : line.match(/^require\s+(.*)$/)?.[1];
    if (!body || /\/\/\s*indirect/.test(body)) continue;
    const req = body.match(REQUIRE_LINE);
    if (req?.[1] && req[2]) signals.push(signal("go", req[1], path, 2, "runtime", req[2]));
  }
  return signals;
}
