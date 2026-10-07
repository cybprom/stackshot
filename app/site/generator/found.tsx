"use client";

import { useGenerator } from "@/app/site/generator/context";
import { StackFound } from "@/app/site/stack-found";

/**
 * "What Stackshot found", once there is something to list. The empty state has no doc in
 * the browser — it is the intro card's own PNG bytes — so there is nothing to key.
 */
export function GeneratorFound() {
  const { doc } = useGenerator();
  return doc ? <StackFound doc={doc} /> : null;
}
