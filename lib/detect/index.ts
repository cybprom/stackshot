import type { RawSignal } from "@/lib/stack-map/types";
import { detectDocker } from "@/lib/detect/dockerfile";
import { detectGo } from "@/lib/detect/go";
import { detectPackageJson } from "@/lib/detect/package-json";
import { detectPaths } from "@/lib/detect/paths";
import { detectPhp } from "@/lib/detect/php";
import { detectPython } from "@/lib/detect/python";
import { detectRuby } from "@/lib/detect/ruby";
import { detectRust } from "@/lib/detect/rust";
import { basename } from "@/lib/detect/signal";
import { detectWorkflows } from "@/lib/detect/workflows";

export type ManifestFile = { path: string; contents: string };

type Detector = (contents: string, path: string) => RawSignal[];

const BY_NAME: Record<string, Detector> = {
  "package.json": detectPackageJson,
  "pyproject.toml": detectPython,
  "requirements.txt": detectPython,
  "go.mod": detectGo,
  "Cargo.toml": detectRust,
  Gemfile: detectRuby,
  "composer.json": detectPhp,
  Dockerfile: detectDocker,
  "docker-compose.yml": detectDocker,
};

const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;

/** Every signal from the fetched manifests plus the tree's root paths. Undeduplicated. */
export function detect(files: ManifestFile[], treePaths: string[]): RawSignal[] {
  const fromFiles = files.flatMap(({ path, contents }) => {
    const detector = WORKFLOW.test(path) ? detectWorkflows : BY_NAME[basename(path)];
    return detector ? detector(contents, path) : [];
  });
  return [...fromFiles, ...detectPaths(treePaths)];
}
