import { Redis } from "@upstash/redis";
import { deployEnv, statsSecret, upstashConfig } from "@/lib/env";
import { authorised, readStats } from "@/lib/stats";

export const runtime = "nodejs";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export async function GET(request: Request) {
  // A wrong key and a missing secret look the same as no route at all.
  if (!authorised(request, statsSecret())) return new Response("Not found", { status: 404 });

  const config = upstashConfig();
  if (!config) return json({ error: "no store configured" }, 503);
  return json(await readStats(new Redis(config), deployEnv(), new Date()), 200);
}
