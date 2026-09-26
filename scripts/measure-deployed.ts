// Cold and warm card latency against a deployed function.
// Usage: pnpm tsx scripts/measure-deployed.ts https://<deployment>.vercel.app [owner/repo ...]
//
// Every request carries a unique query string. The route ignores it, but the CDN does not,
// so each one reaches the function instead of being answered by the edge — otherwise every
// measurement after the first would be timing Vercel's cache. Cold runs clear the repo's
// KV entries first, so "cold" means a real resolve rather than a cold Lambda.
import { Redis } from "@upstash/redis";
import { pointerKey } from "@/lib/cache";
import { upstashConfig } from "@/lib/env";

const REPOS = [
  "Grandbusta/spyde",
  "pmndrs/zustand",
  "fastapi/full-stack-fastapi-template",
  "vercel/next.js",
];

const redis = (() => {
  const config = upstashConfig();
  return config ? new Redis(config) : undefined;
})();

async function clearRepo(owner: string, repo: string) {
  if (!redis) return;
  const key = pointerKey(owner, repo);
  const pointer = await redis.get<{ stackHash?: string }>(key);
  await redis.del(key);
  if (pointer?.stackHash) {
    await redis.del(`stack:${pointer.stackHash}`);
    for (const theme of ["light", "dark"]) await redis.del(`png:${pointer.stackHash}:${theme}`);
  }
}

async function hit(base: string, ref: string) {
  const url = `${base}/${ref}/card-light.png?cb=${Math.random().toString(36).slice(2)}`;
  const started = performance.now();
  const res = await fetch(url);
  const bytes = (await res.arrayBuffer()).byteLength;
  return {
    ms: Math.round(performance.now() - started),
    status: res.status,
    error: res.headers.get("x-stackshot-error"),
    edge: res.headers.get("x-vercel-cache"),
    bytes,
  };
}

async function main() {
  const [base, ...rest] = process.argv.slice(2);
  if (!base) throw new Error("usage: measure-deployed.ts <base-url> [owner/repo ...]");
  const repos = rest.length > 0 ? rest : REPOS;

  console.log(`${"repo".padEnd(38)} ${"run".padEnd(7)} ${"ms".padStart(6)}  ${"KB".padStart(5)}  edge      result`);
  for (const ref of repos) {
    const [owner = "", repo = ""] = ref.split("/");
    await clearRepo(owner, repo);

    for (const label of ["cold", "warm 1", "warm 2", "warm 3"]) {
      const r = await hit(base, ref);
      const result = r.error ?? (r.status === 200 ? "card" : `HTTP ${r.status}`);
      console.log(
        `${ref.padEnd(38)} ${label.padEnd(7)} ${String(r.ms).padStart(6)}  ` +
          `${String(Math.round(r.bytes / 1024)).padStart(5)}  ${(r.edge ?? "-").padEnd(9)} ${result}`,
      );
    }
  }
}

main();
