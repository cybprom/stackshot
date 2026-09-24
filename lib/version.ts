export type Precision = "major" | "minor";

// A concrete version is what the project pins or runs; a floor is what it tolerates, and
// an upper bound can still pin the part we display. ADR-0017, ADR-0019, ADR-0020.
export type Upper = { parts: number[]; inclusive: boolean };
export type ParsedVersion = { bound: "concrete" | "floor"; parts: number[]; upper?: Upper };

// A comparator and version. The lookbehind skips digits glued to other text or to an
// operator we've already rejected: "alpine3.20", "canary.1", git refs, "npm:x@^1".
const COMPARATOR = /(?<![\w.\-@:#/+^~=><!])(\^|~>|~=|~|===|==|=|>=|<=|!=|>|<)?\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/g;
const CONCRETE_OPS = new Set([undefined, "^", "~", "~>", "~=", "==", "===", "="]);
const FLOOR_OPS = new Set([">=", ">"]);
const UPPER_OPS = new Set(["<", "<="]);

/** `^15.1.0` → concrete 15.1.0; `>=3.14,<4.0` → floor 3.14 under 4.0; `latest` → null. */
export function parseVersion(raw: string): ParsedVersion | null {
  const alternatives = raw.split("||").flatMap((alt) => {
    const found = parseRange(alt);
    return found ? [found] : [];
  });
  return best(alternatives);
}

/** One display version from every raw version backing an entry. ADR-0017, 0019, 0020. */
export function mergeVersions(raws: (string | undefined)[], precision: Precision): string | undefined {
  const parsed = raws.flatMap((raw) => {
    const version = raw ? parseVersion(raw) : null;
    return version ? [version] : [];
  });
  // Only versions that render at this precision compete, so an unbounded floor never
  // beats a bounded range that would have shown something.
  const renderable = parsed.filter((v) => displayVersion(v, precision) !== undefined);
  const chosen = best(renderable);
  return chosen ? displayVersion(chosen, precision) : undefined;
}

/**
 * What a parsed version shows at this precision, or undefined when it says nothing:
 * a concrete version always shows; a floor shows only where its upper bound pins every
 * digit we would display. `>=3.14,<4.0` is 3 at major precision and nothing at minor.
 */
export function displayVersion(version: ParsedVersion, precision: Precision): string | undefined {
  const text = formatVersion(version.parts, precision);
  if (text === undefined) return undefined;
  if (version.bound === "concrete") return text;
  if (!version.upper) return undefined;
  // Everything in range must display as `text`, i.e. stay below the next displayed digit.
  const next = displayedParts(version.parts, precision);
  const last = next.length - 1;
  next[last] = (next[last] ?? 0) + 1;
  const withinNext = compare(version.upper.parts, next);
  return (version.upper.inclusive ? withinNext < 0 : withinNext <= 0) ? text : undefined;
}

export function formatVersion(parts: number[], precision: Precision): string | undefined {
  const [major, minor] = parts;
  if (major === undefined) return undefined;
  // In 0.x the minor is the breaking component; in 0.0.x no digit summarizes it.
  if (major === 0) return minor ? `0.${minor}` : undefined;
  if (precision === "minor" && minor !== undefined) return `${major}.${minor}`;
  return `${major}`;
}

// The components formatVersion actually prints, which is what an upper bound must pin.
function displayedParts(parts: number[], precision: Precision): number[] {
  const [major, minor] = parts;
  if (major === 0) return [0, minor ?? 0];
  if (precision === "minor" && minor !== undefined) return [major, minor];
  return [major ?? 0];
}

function parseRange(range: string): ParsedVersion | null {
  const lowers: ParsedVersion[] = [];
  let upper: Upper | undefined;
  for (const match of range.matchAll(COMPARATOR)) {
    const op = match[1];
    const parts = [match[2], match[3], match[4]].flatMap((p) => (p === undefined ? [] : [Number(p)]));
    if (CONCRETE_OPS.has(op)) lowers.push({ bound: "concrete", parts });
    else if (op && FLOOR_OPS.has(op)) lowers.push({ bound: "floor", parts });
    // The tightest upper bound is the one that constrains the display.
    else if (op && UPPER_OPS.has(op) && (!upper || compare(parts, upper.parts) < 0)) {
      upper = { parts, inclusive: op === "<=" };
    }
  }
  const chosen = best(lowers);
  if (!chosen) return null;
  return upper ? { ...chosen, upper } : chosen;
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
