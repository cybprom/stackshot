import { parse } from "smol-toml";
import { z } from "zod";
import type { RawSignal } from "@/lib/stack-map/types";
import { basename, signal } from "@/lib/detect/signal";

const StringList = z.array(z.unknown()).catch([]);
const PoetryDeps = z.record(z.string(), z.unknown()).catch({});

const PyprojectSchema = z.object({
  project: z
    .object({
      "requires-python": z.string().optional().catch(undefined),
      dependencies: StringList.optional(),
      "optional-dependencies": z.record(z.string(), StringList).catch({}).optional(),
    })
    .optional()
    .catch(undefined),
  "dependency-groups": z.record(z.string(), StringList).optional().catch(undefined),
  tool: z
    .object({
      poetry: z
        .object({
          dependencies: PoetryDeps.optional(),
          "dev-dependencies": PoetryDeps.optional(),
          group: z.record(z.string(), z.object({ dependencies: PoetryDeps.optional() })).catch({}).optional(),
        })
        .optional()
        .catch(undefined),
    })
    .optional()
    .catch(undefined),
});

// PEP 508: a name, optional [extras], then the version spec up to any ";" marker.
const REQUIREMENT = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*([^;@]*)/;

/** requirements.txt and pyproject.toml (PEP 621, PEP 735 groups, Poetry). */
export function detectPython(contents: string, path: string): RawSignal[] {
  return basename(path) === "pyproject.toml" ? fromPyproject(contents, path) : fromRequirements(contents, path);
}

function fromRequirements(contents: string, path: string): RawSignal[] {
  return contents.split("\n").flatMap((line) => {
    const text = line.replace(/(^|\s)#.*$/, "").trim();
    // Options (-r, -e, --index-url) and bare URLs aren't named dependencies.
    if (!text || text.startsWith("-") || /^[a-z+]+:\/\//i.test(text)) return [];
    return requirement(text, path);
  });
}

function fromPyproject(contents: string, path: string): RawSignal[] {
  const parsed = PyprojectSchema.safeParse(parseToml(contents));
  if (!parsed.success) return [];
  const { project, tool } = parsed.data;
  const poetry = tool?.poetry;

  const pep508 = [
    ...(project?.dependencies ?? []),
    ...Object.values(project?.["optional-dependencies"] ?? {}).flat(),
    // PEP 735 groups may also hold {include-group = "..."} tables, which aren't deps.
    ...Object.values(parsed.data["dependency-groups"] ?? {}).flat(),
  ].flatMap((dep) => (typeof dep === "string" ? requirement(dep, path) : []));

  const poetryTables = [
    poetry?.dependencies ?? {},
    poetry?.["dev-dependencies"] ?? {},
    ...Object.values(poetry?.group ?? {}).map((g) => g.dependencies ?? {}),
  ];
  const poetryDeps = poetryTables.flatMap((table) =>
    Object.entries(table).flatMap(([name, spec]) => {
      const version = typeof spec === "string" ? spec : versionField(spec);
      if (name === "python") return [signal("tool", "python", path, 2, version)];
      return [signal("pypi", normalize(name), path, 2, version)];
    }),
  );

  const requiresPython = project?.["requires-python"];
  const python = requiresPython ? [signal("tool", "python", path, 2, requiresPython)] : [];
  return [...pep508, ...poetryDeps, ...python];
}

function requirement(text: string, path: string): RawSignal[] {
  const match = text.trim().match(REQUIREMENT);
  if (!match?.[1]) return [];
  const spec = match[2]?.trim();
  return [signal("pypi", normalize(match[1]), path, 2, spec || undefined)];
}

// PEP 503: Flask, flask and FLASK, and foo_bar and foo-bar, are one package.
function normalize(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, "-");
}

function versionField(spec: unknown): string | undefined {
  const parsed = z.object({ version: z.string() }).safeParse(spec);
  return parsed.success ? parsed.data.version : undefined;
}

function parseToml(contents: string): unknown {
  try {
    return parse(contents);
  } catch {
    return null;
  }
}
