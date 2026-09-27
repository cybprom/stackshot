import { isRepoRef } from "@/lib/repo-ref";

// Only these. Not gist.github.com, not raw.githubusercontent.com: neither names a repo in
// the shape this takes, and an allow-list is the point.
const HOSTS = new Set(["github.com", "www.github.com"]);
const BARE = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

export type RepoRef = { owner: string; repo: string };

/**
 * A pasted URL to an owner and repo, or nothing. Accepts what people actually paste — a
 * deep link into a file, a `.git` suffix, a missing scheme, or bare `owner/repo`.
 *
 * The host check is a security boundary, not a convenience: it runs against the parsed
 * hostname, so `https://evil.com/github.com/a/b`, `https://github.com.evil.com/a/b` and
 * `https://github.com@evil.com/a/b` are all rejected on the host they actually resolve to.
 */
export function parseRepoUrl(input: string): RepoRef | undefined {
  const trimmed = input.trim();
  if (trimmed === "") return undefined;

  // `owner/repo` has no host to check, so it is matched before anything is prepended —
  // otherwise "https://" + "owner/repo" would parse `owner` as the hostname.
  if (BARE.test(trimmed)) return fromSegments(trimmed.split("/"));

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return undefined;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return undefined;

  return fromSegments(url.pathname.split("/").filter(Boolean));
}

function fromSegments(segments: string[]): RepoRef | undefined {
  const [owner, rawRepo] = segments;
  if (!owner || !rawRepo) return undefined;
  // Anything after owner/repo is a deep link — /tree/main/src, /blob/..., /issues — and
  // says nothing about which repo was meant.
  const repo = rawRepo.replace(/\.git$/i, "");
  return isRepoRef(owner, repo) ? { owner, repo } : undefined;
}
