import { readFileSync } from "node:fs";

export type RecordedResponse = { status: number; headers: Record<string, string>; body: string };
export type Responses = Record<string, RecordedResponse>;

export function loadResponses(fixture: string): Responses {
  const file = new URL(`../fixtures/github/${fixture}/responses.json`, import.meta.url);
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Serves recorded responses keyed by "METHOD url"; any other URL fails the test. */
export function fixtureFetch(responses: Responses): typeof fetch {
  return async (input, init) => {
    const key = `${init?.method ?? "GET"} ${String(input)}`;
    const hit = responses[key];
    if (!hit) throw new Error(`No fixture for ${key}`);
    return new Response(hit.body, { status: hit.status, headers: hit.headers });
  };
}

/**
 * Fixture responses, but every URL containing `match` answers `ms` late. Honours the
 * abort signal the way real fetch does, so a per-fetch limit can cut it off.
 */
export function slowFixtureFetch(responses: Responses, match: string, ms: number): typeof fetch {
  const base = fixtureFetch(responses);
  return async (input, init) => {
    if (!String(input).includes(match)) return base(input, init);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      init?.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(init.signal?.reason);
        },
        { once: true },
      );
    });
    return base(input, init);
  };
}

/** A fetch that never answers, and rejects the way real fetch does when aborted. */
export const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
