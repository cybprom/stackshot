// GitHub's own limits: owners are 39 chars of [A-Za-z0-9-], repos 100 of [A-Za-z0-9._-].
const OWNER = /^[A-Za-z0-9-]{1,39}$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * A cheap ASCII gate in front of the API calls. Deliberately a superset of GitHub's rules
 * (it allows leading and doubled hyphens): a false accept costs one 404, a false reject
 * would refuse a real repo. Two jobs beyond the budget — it keeps a glyph no shipped font
 * covers out of the card's header, and `.`/`..` out of a raw.githubusercontent path.
 */
export function isRepoRef(owner: string, repo: string): boolean {
  if (repo === "." || repo === "..") return false;
  return OWNER.test(owner) && REPO.test(repo);
}
