// Demo and test apps would otherwise take the package.json slots: in vercel/next.js,
// examples/ sorts before packages/ at the same depth. docs/ is deliberately allowed.
const DENIED_SEGMENTS = new Set([
  "node_modules",
  "examples",
  "example",
  "fixtures",
  "test",
  "tests",
  "__tests__",
  "e2e",
  "samples",
  "demo",
  "templates",
  "bench",
  "vendor",
]);

export function hasDeniedSegment(path: string): boolean {
  return path
    .split("/")
    .slice(0, -1)
    .some((segment) => DENIED_SEGMENTS.has(segment.toLowerCase()));
}

// .github/package.json would otherwise win on sort order alone: "." precedes letters.
export function inDotDir(path: string): boolean {
  return path
    .split("/")
    .slice(0, -1)
    .some((segment) => segment.startsWith("."));
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function depth(path: string): number {
  return path.split("/").length;
}

/**
 * How many `package.json` files selection would actually consider — the same denied-segment
 * and dot-directory filters, so a library whose only others sit under examples counts as one.
 *
 * Size is not applied: a caller holding only paths has no sizes, and a >1 MB package.json
 * is pathological rather than a workspace member.
 */
export function selectablePackageJsonCount(paths: string[]): number {
  return paths.filter(
    (path) =>
      basename(path) === "package.json" &&
      !hasDeniedSegment(path) &&
      (depth(path) === 1 || !inDotDir(path)),
  ).length;
}
