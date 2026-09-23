import type { RawSignal } from "@/lib/stack-map/types";
import { parseImageRef } from "@/lib/detect/image-ref";
import { signal } from "@/lib/detect/signal";

const USES = /^\s*(?:-\s*)?uses:\s*["']?([^"'\s#]+)/;
// `with:` inputs that name a toolchain version. The bare `version:` key is not one of
// them: it means the action's own version for setup-uv, goreleaser and most others.
const SETUP_VERSION = /^\s*(node|python|go|ruby|php|bun|deno|java)-version:\s*["']?([^"'\s#]+)/;
const IMAGE = /^\s*(?:-\s*)?(?:image|container):\s*["']?([^"'\s#{]+)/;

// All dev scope: a workflow is CI, and its service containers are test fixtures.
/** Every `uses:` action and every container image. No YAML semantics. ADR-0015. */
export function detectWorkflows(contents: string, path: string): RawSignal[] {
  const steps = contents.split("\n").flatMap((line) => {
    const uses = line.match(USES)?.[1];
    if (uses?.startsWith("docker://")) return imageSignal(uses.slice("docker://".length), path);
    if (uses) return actionSignal(uses, path);
    const image = line.match(IMAGE)?.[1];
    if (image) return imageSignal(image, path);
    const setup = line.match(SETUP_VERSION);
    return setup?.[1] ? [toolSignal(setup[1], setup[2], path)] : [];
  });
  return [signal("tool", "github-actions", path, 1, "dev"), ...steps];
}

// `github/codeql-action/init@<sha>` → action:github/codeql-action. The ref is the
// action's version, not the tool's, so it isn't passed on.
function actionSignal(uses: string, path: string): RawSignal[] {
  // Local actions and reusable workflows (…/.github/workflows/x.yml) aren't tools.
  if (uses.startsWith("./") || uses.includes("/.github/workflows/")) return [];
  const [owner, repo] = uses.replace(/@.*$/, "").toLowerCase().split("/");
  return owner && repo ? [signal("action", `${owner}/${repo}`, path, 1, "dev")] : [];
}

// `node-version: 20` is a real pin; `lts/*`, `stable` and `${{ matrix.node }}` are not.
function toolSignal(tool: string, value: string | undefined, path: string): RawSignal {
  const version = value && /\d/.test(value) && !value.includes("${{") ? value : undefined;
  return signal("tool", tool, path, 1, "dev", version);
}

function imageSignal(ref: string, path: string): RawSignal[] {
  const image = parseImageRef(ref);
  return image ? [signal("docker", image.name, path, 1, "dev", image.tag)] : [];
}
