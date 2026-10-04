import { z } from "zod";
import type { StackDoc } from "@/lib/stack-map/types";

/**
 * The runtime shape of a `StackDoc`, for the two places one is read back from storage
 * written by a past version of this code: Upstash (`lib/cache.ts`) and the committed
 * `lib/home-data.json` (`lib/home.ts`).
 *
 * **One schema, not one per reader.** The type is structural and the two readers would
 * drift apart silently — the KV copy would accept a doc the homepage refused, or worse the
 * other way round.
 *
 * The two readers answer a mismatch differently, and that difference is the point rather
 * than an inconsistency. KV treats it as a **miss** and re-resolves, because it can: there
 * is a network and a budget at request time. The committed file **fails the build**,
 * because by ADR-0035 there is deliberately no network there to re-resolve with.
 */
export const StackItemSchema = z.object({
  id: z.string(),
  display: z.string(),
  // Required, so a doc written before symbols degrades to a miss and re-resolves.
  symbol: z.string(),
  version: z.string().optional(),
  description: z.string(),
});

export const StackLayerSchema = z.object({
  category: z.enum(["frontend", "backend", "infra", "tooling"]),
  items: z.array(StackItemSchema),
  overflow: z.number(),
});

export const StackDocSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  language: z.string().nullable(),
  stars: z.number(),
  layers: z.array(StackLayerSchema),
  unmapped: z.array(z.string()),
});

// The schema is the authority on the shape; this fails the build if the hand-written type
// and the parsed one ever part company.
const _shape: StackDoc = {} as z.infer<typeof StackDocSchema>;
void _shape;
