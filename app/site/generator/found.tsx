"use client";

import { useGenerator } from "@/app/site/generator/context";
import { StackFound } from "@/app/site/stack-found";

/** "What Stackshot found", once a resolve has given it something to list. */
export function GeneratorFound() {
  const { doc } = useGenerator();
  return doc ? <StackFound doc={doc} /> : null;
}
