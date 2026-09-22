import type { RawSignal } from "@/lib/stack-map/types";
import { parseImageRef } from "@/lib/detect/image-ref";
import { signal } from "@/lib/detect/signal";

const USES = /^\s*(?:-\s*)?uses:\s*["']?([^"'\s#]+)/;
const IMAGE = /^\s*(?:-\s*)?(?:image|container):\s*["']?([^"'\s#{]+)/;

/** Every `uses:` action and every container image. No YAML semantics. ADR-0015. */
export function detectWorkflows(contents: string, path: string): RawSignal[] {
  return contents.split("\n").flatMap((line) => {
    const uses = line.match(USES)?.[1];
    if (uses?.startsWith("docker://")) return imageSignal(uses.slice("docker://".length), path);
    if (uses) return actionSignal(uses, path);
    const image = line.match(IMAGE)?.[1];
    return image ? imageSignal(image, path) : [];
  });
}

// `github/codeql-action/init@<sha>` → action:github/codeql-action. The ref is the
// action's version, not the tool's, so it isn't passed on.
function actionSignal(uses: string, path: string): RawSignal[] {
  // Local actions and reusable workflows (…/.github/workflows/x.yml) aren't tools.
  if (uses.startsWith("./") || uses.includes("/.github/workflows/")) return [];
  const [owner, repo] = uses.replace(/@.*$/, "").toLowerCase().split("/");
  return owner && repo ? [signal("action", `${owner}/${repo}`, path, 1)] : [];
}

function imageSignal(ref: string, path: string): RawSignal[] {
  const image = parseImageRef(ref);
  return image ? [signal("docker", image.name, path, 1, image.tag)] : [];
}
