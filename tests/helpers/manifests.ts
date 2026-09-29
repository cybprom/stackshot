import type { ManifestFile } from "@/lib/detect";
import { loadResponses } from "@/tests/helpers/fixture-fetch";

const RAW = "GET https://raw.githubusercontent.com/";

/** Every manifest body recorded for a fixture repo, keyed back to its repo path. */
export function recordedManifests(fixture: string): ManifestFile[] {
  return Object.entries(loadResponses(fixture)).flatMap(([key, res]) => {
    if (!key.startsWith(RAW) || res.status !== 200) return [];
    // owner / repo / sha / ...path
    const path = key.slice(RAW.length).split("/").slice(3).map(decodeURIComponent).join("/");
    return [{ path, contents: res.body }];
  });
}

export function recordedManifest(fixture: string, path: string): string {
  const file = recordedManifests(fixture).find((f) => f.path === path);
  if (!file) throw new Error(`${fixture} has no recorded ${path}`);
  return file.contents;
}

/**
 * Every path from call 2's recursive tree — what `lib/resolve` actually hands `detect`.
 * Falls back to the root listing for the fixtures recorded without a tree call.
 */
export function recordedTreePaths(fixture: string): string[] {
  const responses = loadResponses(fixture);
  const key = Object.keys(responses).find((k) => k.includes("/git/trees/"));
  if (!key || responses[key]?.status !== 200) return recordedRootPaths(fixture);
  const body: { tree?: { path: string; type: string }[] } = JSON.parse(responses[key].body);
  return (body.tree ?? []).filter((e) => e.type === "blob").map((e) => e.path);
}

/** Root paths from call 1's GraphQL listing, which every recorded repo has. */
export function recordedRootPaths(fixture: string): string[] {
  const graphql = loadResponses(fixture)["POST https://api.github.com/graphql"];
  if (!graphql) return [];
  const body: {
    data?: { repository?: { defaultBranchRef?: { target?: { tree?: { entries?: { name: string }[] } } } } };
  } = JSON.parse(graphql.body);
  return body.data?.repository?.defaultBranchRef?.target?.tree?.entries?.map((e) => e.name) ?? [];
}
