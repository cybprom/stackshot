export type Precision = "major" | "minor";

// A concrete version is what the project pins or runs; a floor is what it tolerates.
export type ParsedVersion = { bound: "concrete" | "floor"; parts: number[] };

// A comparator and version. The lookbehind skips digits glued to other text or to an
// operator we've already rejected: "alpine3.20", "canary.1", git refs, "npm:x@^1".
const COMPARATOR = /(?<![\w.\-@:#/+^~=><!])(\^|~>|~=|~|===|==|=|>=|<=|!=|>|<)?\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/g;
const CONCRETE_OPS = new Set([undefined, "^", "~", "~>", "~=", "==", "===", "="]);
const FLOOR_OPS = new Set([">=", ">"]);

/** `^15.1.0` → concrete 15.1.0; `>=3.14,<4.0` → floor 3.14; `latest` → null. */
export function parseVersion(raw: string): ParsedVersion | null {
  const alternatives = raw.split("||").flatMap((alt) => {
    const found = parseRange(alt);
    return found ? [found] : [];
  });
  return best(alternatives);
}

/** One display version from every raw version backing an entry. ADR-0017. */
export function mergeVersions(raws: (string | undefined)[], precision: Precision): string | undefined {
  const parsed = raws.flatMap((raw) => {
    const version = raw ? parseVersion(raw) : null;
    return version ? [version] : [];
  });
  const chosen = best(parsed);
  return chosen ? formatVersion(chosen.parts, precision) : undefined;
}

export function formatVersion(parts: number[], precision: Precision): string | undefined {
  const [major, minor] = parts;
  if (major === undefined) return undefined;
  // In 0.x the minor is the breaking component; in 0.0.x no digit summarizes it.
  if (major === 0) return minor ? `0.${minor}` : undefined;
  if (precision === "minor" && minor !== undefined) return `${major}.${minor}`;
  return `${major}`;
}

function parseRange(range: string): ParsedVersion | null {
  const candidates: ParsedVersion[] = [];
  for (const match of range.matchAll(COMPARATOR)) {
    const op = match[1];
    const parts = [match[2], match[3], match[4]].flatMap((p) => (p === undefined ? [] : [Number(p)]));
    if (CONCRETE_OPS.has(op)) candidates.push({ bound: "concrete", parts });
    else if (op && FLOOR_OPS.has(op)) candidates.push({ bound: "floor", parts });
  }
  return best(candidates);
}

// Concrete beats floor; within the same bound, the higher version wins.
function best(versions: ParsedVersion[]): ParsedVersion | null {
  const concrete = versions.filter((v) => v.bound === "concrete");
  const pool = concrete.length > 0 ? concrete : versions;
  return pool.reduce<ParsedVersion | null>((top, v) => (top && compare(top.parts, v.parts) >= 0 ? top : v), null);
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
