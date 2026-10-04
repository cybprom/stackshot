import { describe, expect, it } from "vitest";
import {
  HOME_REPOS,
  INTRO_REPO,
  STALE_AFTER_DAYS,
  TRY_REPOS,
  WALL_REPOS,
  ageInDays,
  checkHomeData,
  homeDoc,
} from "@/lib/home";
import { isRepoRef } from "@/lib/repo-ref";
import { layoutTiles } from "@/lib/render/tiles-layout";

/**
 * The committed homepage data. These run against the real file, because the thing being
 * guarded is the file — the homepage makes no GitHub call on any path, so if this is wrong
 * nothing at request time will correct it. ADR-0035.
 */
describe("the committed homepage data", () => {
  it("matches the schema and covers every repo the page shows", () => {
    const result = checkHomeData();
    // Named in the message, so a failure says which repo and which field rather than
    // "expected false to be true".
    expect(result.ok ? [] : result.problems).toEqual([]);
  });

  it("holds the intro card's doc, which the build renders to PNG", () => {
    const doc = homeDoc(INTRO_REPO);
    expect(`${doc.owner}/${doc.repo}`.toLowerCase()).toBe(INTRO_REPO.toLowerCase());
    expect(doc.layers.length).toBeGreaterThan(0);
  });

  it("holds a doc for every Try button", () => {
    for (const ref of TRY_REPOS) expect(() => homeDoc(ref), ref).not.toThrow();
  });
});

describe("the fixed repo list", () => {
  // The route's own name gate, applied before the script ever spends a call.
  it.each(HOME_REPOS)("%s is a legal GitHub ref", (ref) => {
    const [owner = "", repo = ""] = ref.split("/");
    expect(isRepoRef(owner, repo)).toBe(true);
  });

  it("has no duplicates, so no column shows one repo twice", () => {
    expect(new Set(WALL_REPOS).size).toBe(WALL_REPOS.length);
  });

  /**
   * Four columns of eight, duplicated across them (the wall sits at 50% opacity and
   * drifts, so nobody reads the same card twice). Sixteen is what fills that without
   * doubling a review that has to be done by eye.
   */
  it("fills the wall's four columns", () => {
    expect(WALL_REPOS.length).toBe(16);
  });

  it("covers the intro and Try repos without resolving anything twice", () => {
    expect(new Set(HOME_REPOS).size).toBe(HOME_REPOS.length);
    for (const ref of [INTRO_REPO, ...TRY_REPOS, ...WALL_REPOS]) expect(HOME_REPOS).toContain(ref);
  });

  /**
   * The curation rule, asserted rather than left in a comment: a mini-card shows six tile
   * symbols, so a repo that resolves to almost nothing is a blank in the wall. Three
   * libraries were cut for exactly this — a repo does not depend on itself, so
   * `facebook/react` rendered `frontend: Zod` and `django/django` was three cells.
   */
  it.each(WALL_REPOS)("%s resolves to a card worth showing", (ref) => {
    const doc = homeDoc(ref);
    const cells = layoutTiles(doc.layers.slice(0, 4)).reduce(
      (n, l) => n + l.items.length + (l.hidden > 0 ? 1 : 0),
      0,
    );
    expect(cells, `${ref} draws ${cells} tiles`).toBeGreaterThanOrEqual(6);
  });
});

describe("staleness is reported, never fatal", () => {
  const data = (generatedAt: string) => ({ generatedAt, stars: 1, docs: Object.fromEntries(HOME_REPOS.map((r) => [r, homeDoc(r)])) });

  it("ages in whole days from the stamp", () => {
    const now = new Date("2026-03-31T00:00:00.000Z");
    expect(ageInDays("2026-03-01T00:00:00.000Z", now)).toBe(30);
    expect(ageInDays("2026-03-31T00:00:00.000Z", now)).toBe(0);
  });

  // A demonstration card showing a slightly old stack is not worth refusing a deploy over.
  // The build warns past STALE_AFTER_DAYS instead; see scripts/check-home.ts.
  it("stays ok past the stale threshold", () => {
    const now = new Date("2027-01-01T00:00:00.000Z");
    const result = checkHomeData(data("2026-01-01T00:00:00.000Z"), now);
    expect(result.ok).toBe(true);
    expect(result.ok && result.ageDays).toBeGreaterThan(STALE_AFTER_DAYS);
  });
});

describe("what the build refuses", () => {
  it("refuses a doc missing a field the renderer needs", () => {
    const broken = {
      generatedAt: new Date().toISOString(),
      stars: 1,
      // `symbol` was added to StackItem after the first cards shipped. A doc written
      // before it would render blank tiles, silently, on the homepage.
      docs: { [INTRO_REPO]: { ...homeDoc(INTRO_REPO), layers: [{ category: "frontend", items: [{ id: "x", display: "X", description: "" }], overflow: 0 }] } },
    };
    const result = checkHomeData(broken);
    expect(result.ok).toBe(false);
    expect(result.ok || result.problems.join(" ")).toContain("symbol");
  });

  // Adding a name to the list and forgetting to re-run would otherwise be a hole in the
  // wall, or an intro card that renders nothing.
  it("refuses a repo on the list with no doc", () => {
    const result = checkHomeData({ generatedAt: new Date().toISOString(), stars: 1, docs: {} });
    expect(result.ok).toBe(false);
    expect(result.ok || result.problems[0]).toContain(`no doc for ${INTRO_REPO}`);
  });

  it("refuses a file that is not the right shape at all", () => {
    expect(checkHomeData(null).ok).toBe(false);
    expect(checkHomeData({ docs: {} }).ok).toBe(false);
  });
});
