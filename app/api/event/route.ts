import { after } from "next/server";
import { z } from "zod";
import { countEvent, flushCounters, SITE_EVENTS } from "@/lib/counters";
import { LAUNCH_STYLES } from "@/lib/preview";

export const runtime = "nodejs";

// sendBeacon posts text/plain, so the body is read as text and parsed here.
const EventSchema = z.object({ event: z.enum(SITE_EVENTS), style: z.enum(LAUNCH_STYLES).optional() });

/**
 * Copy and download, from the page. Anyone can post here, so these counts are a floor on
 * intent rather than an audit: there is nothing to gain by inflating them. ADR-0012.
 */
export async function POST(request: Request) {
  const body = EventSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return new Response(null, { status: 400 });
  countEvent(body.data.event, body.data.style);
  after(flushCounters);
  return new Response(null, { status: 204 });
}
