import { z } from "zod";
import type { Result } from "@/lib/result";

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

// I6: one GraphQL query plus one REST tree call.
export const API_BUDGET = 2;
// The two calls plus up to six /git/blobs when raw is throttled. ADR-0010.
export const BLOB_FALLBACK_BUDGET = 8;
export const PER_FETCH_MS = 2500;
// Leaves room for a ~2.4s cold render under our 8s working estimate for Camo. ADR-0014.
export const RESOLVE_DEADLINE_MS = 4000;

export type GitHubError =
  | { kind: "not_found" }
  | { kind: "rate_limited"; resetAt: number }
  | { kind: "unauthorized" }
  | { kind: "http"; status: number }
  | { kind: "network"; message: string }
  | { kind: "timeout" }
  | { kind: "bad_response"; message: string };

/** A code path made more authenticated calls than I6 allows. A bug, so it throws. */
export class BudgetExceededError extends Error {
  constructor(budget: number) {
    super(`GitHub API budget of ${budget} exceeded`);
    this.name = "BudgetExceededError";
  }
}

export type GitHubClient = {
  graphql<T>(
    query: string,
    variables: Record<string, unknown>,
    schema: z.ZodType<T>,
  ): Promise<Result<T, GitHubError>>;
  rest<T>(path: string, schema: z.ZodType<T>): Promise<Result<T, GitHubError>>;
  raw(path: string): Promise<Result<string, GitHubError>>;
  calls(): number;
  raiseBudgetForBlobFallback(): void;
  deadlineExpired(): boolean;
};

export type ClientOptions = {
  token: string;
  fetch?: typeof fetch;
  deadline?: AbortSignal;
  perFetchMs?: number;
  now?: () => number;
};

const GraphQLEnvelopeSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.object({ type: z.string().optional(), message: z.string() })).optional(),
});

/** One client per request: the call counter must never be shared across requests. */
export function createGitHubClient(options: ClientOptions): GitHubClient {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const deadline = options.deadline ?? AbortSignal.timeout(RESOLVE_DEADLINE_MS);
  const perFetchMs = options.perFetchMs ?? PER_FETCH_MS;
  const now = options.now ?? Date.now;
  let budget = API_BUDGET;
  let calls = 0;

  const apiHeaders = {
    Authorization: `Bearer ${options.token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "stackshot",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  async function send<T>(
    url: string,
    init: RequestInit,
    read: (res: Response) => Promise<Result<T, GitHubError>>,
  ): Promise<Result<T, GitHubError>> {
    if (deadline.aborted) return { ok: false, error: { kind: "timeout" } };
    const signal = AbortSignal.any([AbortSignal.timeout(perFetchMs), deadline]);
    try {
      const res = await fetchImpl(url, { ...init, signal });
      if (!res.ok) return { ok: false, error: errorFromResponse(res, now()) };
      return await read(res);
    } catch (e) {
      if (signal.aborted) return { ok: false, error: { kind: "timeout" } };
      if (e instanceof SyntaxError) return { ok: false, error: { kind: "bad_response", message: e.message } };
      return { ok: false, error: { kind: "network", message: String(e) } };
    }
  }

  function spend() {
    if (calls >= budget) throw new BudgetExceededError(budget);
    calls++;
  }

  return {
    async graphql(query, variables, schema) {
      if (deadline.aborted) return { ok: false, error: { kind: "timeout" } };
      spend();
      return send(
        `${API}/graphql`,
        { method: "POST", headers: apiHeaders, body: JSON.stringify({ query, variables }) },
        async (res) => {
          const envelope = GraphQLEnvelopeSchema.safeParse(await res.json());
          if (!envelope.success) return badResponse(envelope.error);
          // GraphQL reports not-found and rate limits in a 200 body.
          const types = new Set(envelope.data.errors?.map((e) => e.type));
          if (types.has("RATE_LIMITED")) {
            return { ok: false, error: { kind: "rate_limited", resetAt: resetFrom(res, now()) } };
          }
          if (types.has("NOT_FOUND")) return { ok: false, error: { kind: "not_found" } };
          const data = schema.safeParse(envelope.data.data);
          return data.success ? { ok: true, value: data.data } : badResponse(data.error);
        },
      );
    },

    async rest(path, schema) {
      if (deadline.aborted) return { ok: false, error: { kind: "timeout" } };
      spend();
      return send(`${API}${path}`, { headers: apiHeaders }, async (res) => {
        const data = schema.safeParse(await res.json());
        return data.success ? { ok: true, value: data.data } : badResponse(data.error);
      });
    },

    // Authenticated raw fetches don't touch the core bucket (GOTCHAS 010). The host is
    // fixed here so the token can't be sent anywhere else.
    raw(path) {
      return send(`${RAW}/${path}`, { headers: apiHeaders }, async (res) => ({
        ok: true,
        value: await res.text(),
      }));
    },

    calls: () => calls,

    raiseBudgetForBlobFallback() {
      if (budget === BLOB_FALLBACK_BUDGET) return;
      budget = BLOB_FALLBACK_BUDGET;
      console.warn(`github: raw fetch failed, blob fallback, budget raised to ${budget}`);
    },

    deadlineExpired: () => deadline.aborted,
  };
}

/** Maps a non-2xx response to a typed error. Exported for the mapping table test. */
export function errorFromResponse(res: Response, now: number): GitHubError {
  const { status, headers } = res;
  if (status === 401) return { kind: "unauthorized" };
  if (status === 404) return { kind: "not_found" };
  if (status === 403 || status === 429) {
    const primary = headers.get("x-ratelimit-remaining") === "0";
    const secondary = headers.has("retry-after");
    // GitHub's docs: a 429 without headers still means wait at least a minute.
    if (primary || secondary || status === 429) {
      return { kind: "rate_limited", resetAt: resetFrom(res, now) };
    }
  }
  return { kind: "http", status };
}

function resetFrom(res: Response, now: number): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (retryAfter > 0) return now + retryAfter * 1000;
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (reset > 0) return reset * 1000;
  return now + 60_000;
}

function badResponse(error: z.ZodError): { ok: false; error: GitHubError } {
  return { ok: false, error: { kind: "bad_response", message: z.prettifyError(error) } };
}
