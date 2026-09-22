import { describe, expect, it } from "vitest";
import type { StackContent } from "@/lib/stack-map/types";
import { API_BUDGET, createGitHubClient } from "@/lib/github/client";
import { resolve } from "@/lib/resolve";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";

const REPOS = [
  "Grandbusta__spyde",
  "vercel__next.js",
  "fastapi__full-stack-fastapi-template",
  "pocketbase__pocketbase",
  "astral-sh__uv",
  "mastodon__mastodon",
  "laravel__laravel",
  "github__gitignore",
];

function clientFor(fixture: string) {
  return createGitHubClient({ token: "t", fetch: fixtureFetch(loadResponses(fixture)) });
}

async function resolveFixture(fixture: string, [owner = "", repo = ""] = fixture.split("__")) {
  const client = clientFor(fixture);
  return { client, result: await resolve(client, owner, repo) };
}

// What the card would say, one line per layer. Descriptions are site-only and left out.
function card(doc: StackContent): string[] {
  return [
    `${doc.owner}/${doc.repo} · ${doc.language ?? "no language"} · ${doc.stars} stars`,
    ...doc.layers.map((l) => {
      const items = l.items.map((i) => (i.version ? `${i.display} ${i.version}` : i.display)).join(", ");
      return `${l.category.toUpperCase().padEnd(8)} ${items}${l.overflow ? `  +${l.overflow} more` : ""}`;
    }),
    `unmapped: ${doc.unmapped.length}`,
  ];
}

describe("resolve against each fixture repo", () => {
  it.each(REPOS)("%s", async (fixture) => {
    const { result } = await resolveFixture(fixture);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(card(result.value.doc)).toMatchSnapshot();
  });

  it("keeps every card inside I4: at most 4 layers of at most 6 items", async () => {
    for (const fixture of REPOS) {
      const { result } = await resolveFixture(fixture);
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      expect(result.value.doc.layers.length).toBeLessThanOrEqual(4);
      for (const layer of result.value.doc.layers) expect(layer.items.length).toBeLessThanOrEqual(6);
    }
  });
});

describe("resolve failures are typed results", () => {
  it("a repo with no manifests and no workflows is no_manifests", async () => {
    const { result } = await resolveFixture("jlevy__the-art-of-command-line");
    expect(result).toEqual({ ok: false, error: { kind: "no_manifests" } });
  });

  it("an empty repo is no_manifests, not a crash", async () => {
    const { result } = await resolveFixture("derived__empty-repo", ["Grandbusta", "spyde"]);
    expect(result).toEqual({ ok: false, error: { kind: "no_manifests" } });
  });

  it("a missing repo is not_found", async () => {
    const { result } = await resolveFixture("Grandbusta__stackshot-fixture-missing-repo");
    expect(result).toEqual({ ok: false, error: { kind: "not_found" } });
  });
});

// I6, over the full resolver and every recorded repo.
describe("budget", () => {
  it.each([...REPOS, "jlevy__the-art-of-command-line"])("%s makes at most 2 GitHub API calls", async (fixture) => {
    const { client } = await resolveFixture(fixture);
    expect(client.calls()).toBeLessThanOrEqual(API_BUDGET);
  });
});
