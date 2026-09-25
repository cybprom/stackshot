/**
 * Read lazily and never throw. A module-scope throw here would stop the route module from
 * loading at all, and every README embedding a card would show a broken image at once —
 * the failure I5 exists to prevent. Missing configuration degrades; `pnpm build` is what
 * refuses to ship it. See scripts/check-env.ts.
 */

export type UpstashConfig = { url: string; token: string };

export function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || undefined;
}

export function upstashConfig(): UpstashConfig | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : undefined;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

// What scripts/check-env.ts refuses to build without. Names only: the script reports which
// are missing, and must never print a value.
export const REQUIRED_IN_PRODUCTION = [
  "GITHUB_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

export function missingRequired(): string[] {
  return REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]);
}
