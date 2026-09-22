const DOCKER_HUB = new Set(["docker.io", "index.docker.io", "registry-1.docker.io"]);

export type ImageRef = { name: string; tag?: string };

/** `docker.io/library/postgres:16@sha256:…` → { name: "postgres", tag: "16" }. */
export function parseImageRef(ref: string): ImageRef | null {
  const bare = ref.replace(/@[^@]*$/, "");
  const slash = bare.lastIndexOf("/");
  const colon = bare.lastIndexOf(":");
  const name = colon > slash ? bare.slice(0, colon) : bare;
  const tag = colon > slash ? bare.slice(colon + 1) : undefined;
  // An unresolved variable in the name means we can't say what the image is.
  if (!name || name.includes("$") || name === "scratch") return null;

  const parts = name.toLowerCase().split("/");
  if (parts.length > 1 && DOCKER_HUB.has(parts[0] ?? "")) parts.shift();
  if (parts.length === 2 && parts[0] === "library") parts.shift();
  const clean = parts.join("/");
  return tag && !tag.includes("$") ? { name: clean, tag } : { name: clean };
}

/** Expands ${VAR}, ${VAR:-default} and $VAR; unknown variables are left in place. */
export function substitute(text: string, vars: ReadonlyMap<string, string>): string {
  return text.replace(/\$\{(\w+)(?::?-([^}]*))?\}|\$(\w+)/g, (whole, braced, fallback, plain) => {
    const value = vars.get(braced ?? plain);
    if (value !== undefined && value !== "") return value;
    return fallback ?? whole;
  });
}
