import type { StackDoc } from "@/lib/stack-map/types";
import { createGitHubClient } from "@/lib/github/client";
import { resolve } from "@/lib/resolve";
import { fixtureFetch, loadResponses } from "@/tests/helpers/fixture-fetch";

export const DOC_FIXTURES = [
  "Grandbusta__spyde",
  "vercel__next.js",
  "fastapi__full-stack-fastapi-template",
  "pocketbase__pocketbase",
  "astral-sh__uv",
  "mastodon__mastodon",
  "laravel__laravel",
  "pmndrs__zustand",
  "github__gitignore",
];

/** The StackDoc a fixture repo resolves to, ready to render. */
export async function fixtureDoc(fixture: string): Promise<StackDoc> {
  const [owner = "", repo = ""] = fixture.split("__");
  const client = createGitHubClient({ token: "fixture", fetch: fixtureFetch(loadResponses(fixture)) });
  const result = await resolve(client, owner, repo);
  if (!result.ok) throw new Error(`${fixture}: ${JSON.stringify(result.error)}`);
  return result.value.doc;
}
