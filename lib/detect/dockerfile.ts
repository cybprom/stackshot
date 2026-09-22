import type { RawSignal } from "@/lib/stack-map/types";
import { parseImageRef, substitute } from "@/lib/detect/image-ref";
import { basename, signal } from "@/lib/detect/signal";

const ARG = /^\s*ARG\s+(\w+)=(?:"([^"]*)"|'([^']*)'|(\S*))/i;
const FROM = /^\s*FROM\s+(?:--\S+\s+)*(\S+)(?:\s+AS\s+(\S+))?/i;
const IMAGE = /^\s*image:\s*["']?([^"'\s#]+)/;
const COMPOSE = /^(docker-)?compose\.ya?ml$/;

/** Every base image in a Dockerfile, or every `image:` in a compose file. ADR-0015. */
export function detectDocker(contents: string, path: string): RawSignal[] {
  const images = COMPOSE.test(basename(path)) ? fromCompose(contents, path) : fromDockerfile(contents, path);
  // The file's existence is the "uses Docker" signal; the images are what it runs.
  return [signal("tool", "docker", path, 1), ...images];
}

function fromDockerfile(contents: string, path: string): RawSignal[] {
  // ARG defaults resolve `FROM ${BASE_REGISTRY}/node:${NODE_MAJOR_VERSION}` (mastodon).
  const args = new Map<string, string>();
  const stages = new Set<string>();
  const signals: RawSignal[] = [];

  for (const line of contents.split("\n")) {
    const arg = line.match(ARG);
    if (arg?.[1]) {
      args.set(arg[1], substitute(arg[2] ?? arg[3] ?? arg[4] ?? "", args));
      continue;
    }
    const from = line.match(FROM);
    if (!from?.[1]) continue;
    const ref = substitute(from[1], args);
    const isStage = stages.has(ref.toLowerCase());
    if (from[2]) stages.add(from[2].toLowerCase());
    if (isStage) continue;
    const image = parseImageRef(ref);
    if (image) signals.push(signal("docker", image.name, path, 1, image.tag));
  }
  return signals;
}

function fromCompose(contents: string, path: string): RawSignal[] {
  return contents.split("\n").flatMap((line) => {
    const match = line.match(IMAGE);
    const image = match?.[1] ? parseImageRef(substitute(match[1], new Map())) : null;
    return image ? [signal("docker", image.name, path, 1, image.tag)] : [];
  });
}
